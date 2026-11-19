import * as ImagePicker from "expo-image-picker";
import { File, Paths } from "expo-file-system";
import { fetchWithAuth } from "../utils/api";
import type { Lipgloss } from "../types/Lipgloss";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type ProductImageAsset = ImagePicker.ImagePickerAsset;

function getImageMimeType(asset: ProductImageAsset): string {
  const name = asset.fileName ?? asset.uri.split("?")[0];
  const extension = name.split(".").pop()?.toLowerCase();
  const mimeFromExtension =
    extension === "jpg" || extension === "jpeg" ? "image/jpeg" :
    extension === "png" ? "image/png" :
    extension === "webp" ? "image/webp" : undefined;
  // Prefer the declared MIME type, but do not disguise unsupported formats.
  return asset.mimeType?.toLowerCase() || mimeFromExtension || "";
}

function validateImage(asset: ProductImageAsset): string {
  if (!asset.uri) throw new Error("No se pudo leer la fotografía seleccionada.");
  const mime = getImageMimeType(asset);
  if (!ALLOWED_MIME_TYPES.has(mime)) {
    throw new Error("Selecciona una imagen JPG, PNG o WEBP. Las fotografías HEIC deben convertirse antes de subirlas.");
  }
  if (asset.fileSize !== undefined && asset.fileSize > MAX_FILE_SIZE) {
    throw new Error("La imagen no puede superar los 5 MB.");
  }
  return mime;
}

export async function chooseProductImage(source: "library" | "camera" = "library"): Promise<ProductImageAsset | null> {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error("Permite el acceso a la cámara para continuar.");
  } else {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error("Permite el acceso a las fotos para continuar.");
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    allowsEditing: false,
    quality: 0.85,
  };
  const result = source === "camera"
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  validateImage(asset);
  return asset;
}

export async function uploadProductImage(productId: number, asset: ProductImageAsset): Promise<Lipgloss> {
  if (!Number.isSafeInteger(productId) || productId <= 0) throw new Error("Producto inválido.");
  const mime = validateImage(asset);
  const extension = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";

  // Expo's current fetch/FormData requires a real Blob/File. Appending
  // { uri, name, type } throws "Unsupported FormDataPart implementation".
  const selectedFile = new File(asset.uri);
  if (!selectedFile.exists) throw new Error("No se encontró la fotografía en el dispositivo.");
  if (selectedFile.size <= 0) throw new Error("La fotografía está vacía.");
  if (selectedFile.size > MAX_FILE_SIZE) throw new Error("La imagen no puede superar los 5 MB.");

  // Give the upload a predictable extension and Blob MIME type. Copying
  // does not convert image bytes; the server still validates the contents.
  const uploadFile = new File(Paths.cache, `lipgloss-upload-${productId}-${Date.now()}.${extension}`);
  await selectedFile.copy(uploadFile);
  try {
    const form = new FormData();
    form.append("image", uploadFile);
    // fetchWithAuth adds the Token header. Do not manually add Content-Type:
    // fetch generates multipart/form-data with its required boundary.
    return await fetchWithAuth<Lipgloss>(`/api/lipglosses/${productId}/`, {
      method: "PATCH",
      body: form,
    });
  } finally {
    try { uploadFile.delete(); } catch { /* Do not mask the upload response. */ }
  }
}
