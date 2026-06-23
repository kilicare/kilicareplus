import { v2 as cloudinary } from 'cloudinary'

// Cloudinary configuration - these should come from environment
// For now, we'll use unsigned uploads which require upload preset
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || ''
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || ''

export interface CloudinaryUploadResult {
  secure_url: string
  public_id: string
  resource_type: 'image' | 'video' | 'auto'
  format: string
  bytes: number
  width?: number
  height?: number
  duration?: number
  original_filename: string
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

/**
 * Upload file directly to Cloudinary with progress tracking
 */
export async function uploadToCloudinary(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<CloudinaryUploadResult> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary configuration missing')
  }

  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
    formData.append('cloud_name', CLOUDINARY_CLOUD_NAME)

    const xhr = new XMLHttpRequest()

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percentage: Math.round((e.loaded / e.total) * 100),
          })
        }
      })
    }

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText)
          resolve({
            secure_url: response.secure_url,
            public_id: response.public_id,
            resource_type: response.resource_type,
            format: response.format,
            bytes: response.bytes,
            width: response.width,
            height: response.height,
            duration: response.duration,
            original_filename: response.original_filename,
          })
        } catch (e) {
          reject(new Error('Failed to parse Cloudinary response'))
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'))
    })

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'))
    })

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`)
    xhr.send(formData)
  })
}

/**
 * Validate file before upload
 */
export function validateFileForUpload(file: File, type: 'media' | 'audio'): { valid: boolean; error?: string } {
  const maxSize = type === 'media' ? 50 * 1024 * 1024 : 10 * 1024 * 1024 // 50MB media, 10MB audio
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: type === 'media' 
        ? 'Faili lazima iwe chini ya 50MB' 
        : 'Faili la sauti lazima iwe chini ya 10MB',
    }
  }

  const allowedTypes = type === 'media' 
    ? ['image/', 'video/'] 
    : ['audio/']
  
  if (!allowedTypes.some(t => file.type.startsWith(t))) {
    return {
      valid: false,
      error: type === 'media'
        ? 'Aina ya faili haijaidhinishwa. Tumia picha au video tu.'
        : 'Aina ya faili haijaidhinishwa. Tumia sauti tu.',
    }
  }

  return { valid: true }
}

/**
 * Extract resource type from file
 */
export function getResourceType(file: File): 'image' | 'video' | 'audio' {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return 'image' // fallback
}
