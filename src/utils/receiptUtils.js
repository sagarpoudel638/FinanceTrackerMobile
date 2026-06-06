import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

// Directory where receipt images are stored (persists across app restarts)
const RECEIPTS_DIR = FileSystem.documentDirectory + 'receipts/';

const ensureDir = async () => {
  const info = await FileSystem.getInfoAsync(RECEIPTS_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(RECEIPTS_DIR, { intermediates: true });
};

/**
 * Compress and save a receipt image.
 * Returns the saved file path, or null on failure.
 */
export const saveReceiptImage = async (sourceUri) => {
  await ensureDir();

  // Resize to max 1280px wide, compress to ~70% quality
  const manipulated = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: 1280 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );

  const filename  = `receipt_${Date.now()}.jpg`;
  const destPath  = RECEIPTS_DIR + filename;
  await FileSystem.copyAsync({ from: manipulated.uri, to: destPath });
  return destPath;
};

/**
 * Pick an image from the camera roll.
 * Returns the saved path, or null if cancelled.
 */
export const pickReceiptFromLibrary = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  return saveReceiptImage(result.assets[0].uri);
};

/**
 * Take a photo with the camera.
 * Returns the saved path, or null if cancelled.
 */
export const pickReceiptFromCamera = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchCameraAsync({
    quality: 1,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  return saveReceiptImage(result.assets[0].uri);
};

/**
 * Delete a receipt file from disk.
 */
export const deleteReceiptFile = async (filePath) => {
  if (!filePath) return;
  try {
    const info = await FileSystem.getInfoAsync(filePath);
    if (info.exists) await FileSystem.deleteAsync(filePath);
  } catch {}
};
