import { PDFParse } from 'pdf-parse'

// Helper to extract text and process attachments
export interface ReceivedAttachment {
  id?: string
  name: string
  size: number
  type: string
  url?: string
  base64?: string
}

export interface ExtractedAttachmentResult {
  name: string
  type: string
  extractedText?: string
  isImage: boolean
  imageUrl?: string
}

/**
 * Extract text from PDF buffer
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy().catch(() => {})
    return result.text ? result.text.trim() : ''
  } catch (error) {
    console.error('[PDF Parser Error]:', error)
    return `[Could not extract text from PDF: ${(error as Error).message}]`
  }
}

/**
 * Processes incoming attachments: extracts text from PDFs & docs, formats images
 */
export async function processAttachments(
  attachments: ReceivedAttachment[] = []
): Promise<ExtractedAttachmentResult[]> {
  const results: ExtractedAttachmentResult[] = []

  for (const att of attachments) {
    const rawBase64 = att.base64 || att.url || ''
    const cleanBase64 = rawBase64.replace(/^data:[^;]+;base64,/, '')
    const mimeType = att.type?.toLowerCase() || ''
    const fileName = att.name || 'attachment'

    // 1. Image
    if (mimeType.startsWith('image/')) {
      const dataUrl = rawBase64.startsWith('data:')
        ? rawBase64
        : `data:${mimeType || 'image/png'};base64,${cleanBase64}`

      results.push({
        name: fileName,
        type: mimeType,
        isImage: true,
        imageUrl: dataUrl,
      })
      continue
    }

    // 2. PDF Document
    if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
      if (cleanBase64) {
        const buffer = Buffer.from(cleanBase64, 'base64')
        const text = await extractPdfText(buffer)
        results.push({
          name: fileName,
          type: mimeType,
          isImage: false,
          extractedText: text,
        })
      }
      continue
    }

    // 3. Text / Markdown / Code / JSON / CSV files
    if (
      mimeType.startsWith('text/') ||
      mimeType === 'application/json' ||
      fileName.match(/\.(txt|md|csv|json|js|ts|py|html|css|env)$/i)
    ) {
      if (cleanBase64) {
        try {
          const text = Buffer.from(cleanBase64, 'base64').toString('utf-8')
          results.push({
            name: fileName,
            type: mimeType,
            isImage: false,
            extractedText: text.trim(),
          })
        } catch (err) {
          console.error('[Text Decoder Error]:', err)
        }
      }
      continue
    }

    // 4. Fallback for other documents
    results.push({
      name: fileName,
      type: mimeType,
      isImage: false,
      extractedText: `[Attached file: ${fileName} (${(att.size / 1024).toFixed(1)} KB)]`,
    })
  }

  return results
}
