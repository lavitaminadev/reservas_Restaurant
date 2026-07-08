import { getSupabaseClient } from "../supabase/client";
import type { CompanyFile, FileCategory } from "../types/database";

export async function getCompanyFiles(
  companyId: string,
  category?: FileCategory
): Promise<CompanyFile[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("company_files")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getCompanyFile(id: string): Promise<CompanyFile | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("company_files")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function getFileDownloadUrl(
  bucket: string,
  filePath: string
): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 3600);

  if (error) throw error;
  return data.signedUrl;
}

export async function uploadCompanyFile(input: {
  company_id: string;
  user_id: string;
  category: FileCategory;
  file: File;
  checksum?: string;
}): Promise<{ file: CompanyFile; storage_path: string }> {
  const supabase = getSupabaseClient();
  const extension = input.file.name.split(".").pop();
  const storagePath = `${input.company_id}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("company_files")
    .upload(storagePath, input.file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: file, error: dbError } = await supabase
    .from("company_files")
    .insert({
      company_id: input.company_id,
      uploaded_by: input.user_id,
      category: input.category,
      filename: storagePath,
      original_name: input.file.name,
      mime_type: input.file.type,
      size_bytes: input.file.size,
      storage_path: storagePath,
      checksum: input.checksum ?? null,
    })
    .select()
    .single();

  if (dbError) {
    await supabase.storage.from("company_files").remove([storagePath]);
    throw dbError;
  }

  return { file, storage_path: storagePath };
}

export async function deleteCompanyFile(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const file = await getCompanyFile(id);
  if (!file) throw new Error("File not found");

  const { error: storageError } = await supabase.storage
    .from("company_files")
    .remove([file.storage_path]);

  if (storageError) throw storageError;

  const { error: dbError } = await supabase
    .from("company_files")
    .delete()
    .eq("id", id);

  if (dbError) throw dbError;
}

export async function getFileCategories(): Promise<
  { value: FileCategory; label: string }[]
> {
  return [
    { value: "carta", label: "Carta/Menú" },
    { value: "faq", label: "FAQ" },
    { value: "promociones", label: "Promociones" },
    { value: "horarios", label: "Horarios" },
    { value: "eventos", label: "Eventos" },
    { value: "reglas", label: "Reglas" },
    { value: "politicas_reserva", label: "Políticas de Reserva" },
    { value: "documentos_internos", label: "Documentos Internos" },
    { value: "imagenes", label: "Imágenes" },
    { value: "other", label: "Otros" },
  ];
}

export async function getFilesMetrics(
  companyId: string
): Promise<{ total: number; by_category: Record<string, number> }> {
  const supabase = getSupabaseClient();
  const files = await getCompanyFiles(companyId);

  const by_category: Record<string, number> = {};
  for (const f of files) {
    by_category[f.category] = (by_category[f.category] ?? 0) + 1;
  }

  return { total: files.length, by_category };
}
