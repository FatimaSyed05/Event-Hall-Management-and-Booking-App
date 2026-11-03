const CLOUD_NAME = 'gv7qinac';
const UPLOAD_PRESET = 'eventhall-uploads';

export interface CloudinaryResult {
  url: string;
  publicId: string;
}

export const uploadToCloudinary = async (
  fileUri: string,
  fileName: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<CloudinaryResult> => {
  try {
    console.log('Uploading:', fileName, '| type:', resourceType);
    console.log('File URI:', fileUri);

    const formData = new FormData();

    let mimeType = 'image/jpeg';
    if (resourceType === 'video') mimeType = 'video/mp4';
    if (resourceType === 'raw') mimeType = 'application/pdf';

    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any);

    formData.append('upload_preset', UPLOAD_PRESET);
    const endpointType = resourceType === 'video' ? 'video' : resourceType === 'raw' ? 'raw' : 'image';
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${endpointType}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );
    const data = await response.json();
    if (!response.ok) {
      console.error('Cloudinary error:', data);
      throw new Error(data.error?.message || 'Upload failed');
    }
    console.log('Upload successful:', data.secure_url);
    return {
      url: data.secure_url,
      publicId: data.public_id,
    };
  } catch (error: any) {
    console.error('Upload failed:', error.message);
    throw error;
  }
};

export const uploadMultipleToCloudinary = async (
  files: { uri: string; type: 'image' | 'video'; name?: string }[]
): Promise<{ uri: string; type: 'image' | 'video'; publicId: string }[]> => {
  const results = [];
  for (const file of files) {
    const fileName = file.name || `media_${Date.now()}.${file.type === 'video' ? 'mp4' : 'jpg'}`;
    const result = await uploadToCloudinary(file.uri, fileName, file.type);
    results.push({ uri: result.url, type: file.type, publicId: result.publicId });
  }
  return results;
};