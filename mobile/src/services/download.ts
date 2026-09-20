import { Platform, Share } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

type SaveResult = { shared: boolean; uri?: string };

const webDownload = (
  blob: Blob,
  filename: string
): SaveResult => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return { shared: true };
};

/**
 * Writes a file into the cache directory and opens the native share sheet.
 * Falls back to a browser download when running on web.
 */
const saveAndShare = async (
  filename: string,
  contents: string | Uint8Array,
  mimeType: string
): Promise<SaveResult> => {
  if (Platform.OS === 'web') {
    const blob =
      typeof contents === 'string'
        ? new Blob([contents], { type: mimeType })
        : new Blob([contents as BlobPart], {
            type: mimeType,
          });

    return webDownload(blob, filename);
  }

  const file = new File(Paths.cache, filename);

  if (file.exists) file.delete();
  file.create();
  file.write(contents);

  if (!(await Sharing.isAvailableAsync())) {
    return { shared: false, uri: file.uri };
  }

  await Sharing.shareAsync(file.uri, {
    mimeType,
    dialogTitle: 'Share mood report',
    UTI:
      mimeType === 'application/pdf'
        ? 'com.adobe.pdf'
        : 'public.comma-separated-values-text',
  });

  return { shared: true, uri: file.uri };
};

export const saveCsv = (filename: string, csv: string) =>
  saveAndShare(filename, csv, 'text/csv');

export const savePdf = (
  filename: string,
  bytes: Uint8Array
) => saveAndShare(filename, bytes, 'application/pdf');

export const shareLink = async (
  url: string,
  message?: string
) => {
  if (Platform.OS === 'web') {
    const nav = navigator as Navigator & {
      share?: (data: {
        title?: string;
        text?: string;
        url?: string;
      }) => Promise<void>;
    };

    if (nav.share) {
      await nav.share({
        title: 'CareCircle mood report',
        text: message,
        url,
      });

      return true;
    }

    await navigator.clipboard?.writeText(url);

    return false;
  }

  // Sharing.shareAsync only handles local files, so links go through the
  // React Native Share sheet instead.
  await Share.share({
    message: message ? `${message}\n${url}` : url,
    url,
  });

  return true;
};
