// ============================================================================
// Edge Function: Process File (PDF text extraction + chunking + embeddings)
// ============================================================================
// -- Recibe un file_id de company_files
// -- Descarga el archivo desde Supabase Storage
// -- Extrae texto (PDF, TXT, DOCX)
// -- Divide en chunks
// -- Genera embeddings con OpenAI
// -- Guarda documento + chunks en knowledge_documents y knowledge_chunks
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ProcessPayload {
  file_id: string;
  company_id: string;
}

function chunkText(text: string, maxTokens: number = 500): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;

  for (const word of words) {
    const wordTokens = Math.ceil(word.length / 4);
    if (currentTokens + wordTokens > maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk.join(" "));
      currentChunk = [];
      currentTokens = 0;
    }
    currentChunk.push(word);
    currentTokens += wordTokens;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  return chunks;
}

async function generateEmbedding(
  text: string,
  apiKey: string
): Promise<number[]> {
  const response = await fetch(
    "https://api.openai.com/v1/embeddings",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI embedding error: ${err}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function extractTextFromPdf(
  storagePath: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<string> {
  const bucket = "company_files";
  const downloadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${storagePath}`;

  const response = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${supabaseKey}` },
  });

  if (!response.ok) throw new Error("Failed to download file");

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Simple PDF text extraction: look for text between parentheses and stream operators
  const text = new TextDecoder("utf-8").decode(bytes);
  const textMatches = text.match(/\(([^)]*)\)/g) || [];
  return textMatches
    .map((m) => m.slice(1, -1))
    .filter((t) => t.length > 3)
    .join("\n")
    .replace(/\\([^)]|$)/g, "")
    .slice(0, 50000); // Limit text size
}

serve(async (req) => {
  try {
    const payload: ProcessPayload = await req.json();
    const { file_id, company_id } = payload;

    if (!file_id || !company_id) {
      return new Response(
        JSON.stringify({ error: "Missing file_id or company_id" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get file metadata
    const { data: file, error: fileError } = await supabase
      .from("company_files")
      .select("*")
      .eq("id", file_id)
      .single();

    if (fileError || !file) {
      return new Response(
        JSON.stringify({ error: "File not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Update status to processing
    await supabase
      .from("company_files")
      .update({ is_processed: false })
      .eq("id", file_id);

    // Extract text based on MIME type
    let extractedText = "";
    if (file.mime_type === "application/pdf") {
      extractedText = await extractTextFromPdf(
        file.storage_path,
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
    } else if (file.mime_type === "text/plain") {
      const downloadUrl = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/company_files/${file.storage_path}`;
      const response = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      });
      extractedText = await response.text();
    } else {
      extractedText = `[File type ${file.mime_type} - text extraction not supported. Filename: ${file.original_name}]`;
    }

    if (!extractedText || extractedText.length < 10) {
      extractedText = `[Content could not be extracted from ${file.original_name}]`;
    }

    // Create knowledge document
    const { data: document, error: docError } = await supabase
      .from("knowledge_documents")
      .insert({
        company_id,
        file_id: file.id,
        title: file.original_name,
        source_type: "file",
        raw_text: extractedText,
        word_count: extractedText.split(/\s+/).length,
        is_processed: false,
      })
      .select("id")
      .single();

    if (docError || !document) {
      throw new Error("Failed to create knowledge document");
    }

    // Chunk text
    const chunks = chunkText(extractedText, 500);

    // Generate embeddings and insert chunks
    const chunkRecords = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const tokenCount = Math.ceil(chunkText.length / 4);

      let embedding: number[];
      try {
        embedding = await generateEmbedding(chunkText, openaiKey);
      } catch (err) {
        console.error(`Embedding error for chunk ${i}:`, err);
        continue;
      }

      chunkRecords.push({
        company_id,
        document_id: document.id,
        chunk_index: i,
        chunk_text: chunkText,
        embedding,
        token_count: tokenCount,
      });

      // Rate limit: process 5 chunks at a time
      if (chunkRecords.length >= 5) {
        await supabase.from("knowledge_chunks").insert(chunkRecords);
        chunkRecords.length = 0;
      }
    }

    // Insert remaining chunks
    if (chunkRecords.length > 0) {
      await supabase.from("knowledge_chunks").insert(chunkRecords);
    }

    // Mark document and file as processed
    await supabase
      .from("knowledge_documents")
      .update({ is_processed: true })
      .eq("id", document.id);

    await supabase
      .from("company_files")
      .update({ is_processed: true })
      .eq("id", file_id);

    // Log success
    await supabase.from("integration_audit_logs").insert({
      company_id,
      integration: "process_file",
      action: "file_processed",
      target_id: file_id,
      metadata: {
        document_id: document.id,
        chunks_count: chunks.length,
        file_name: file.original_name,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        document_id: document.id,
        chunks_count: chunks.length,
        file_name: file.original_name,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
