'use client'

import { useState, useEffect } from 'react'
import { AttachmentAPI, type Attachment } from '@/lib/integration/client/attachment/attachments'
import GenericConfirmationModal from '@/components/GenericConfirmationModal'

interface LoadingStates {
  [key: string]: 'downloading' | 'viewing' | null
}

export default function AttachmentsPage() {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [attachmentToDelete, setAttachmentToDelete] = useState<Attachment | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({})

  const fetchAttachments = async () => {
    try {
      setError(null)
      const data = await AttachmentAPI.getAllAttachments()
      setAttachments(data.attachments)
    } catch (err) {
      console.error('Failed to fetch attachments:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch attachments')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (attachment: Attachment) => {
    try {
      setLoadingStates(prev => ({ ...prev, [attachment.id]: 'downloading' }))
      
      // Get the blob URL with SAS token
      const blobUrl = await AttachmentAPI.getAttachmentBlobUrl(attachment.id)
      
      // Create a temporary link and trigger download
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = attachment.filename || 'attachment'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    } catch (err) {
      console.error('Download failed:', err)
      alert(`Download failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoadingStates(prev => ({ ...prev, [attachment.id]: null }))
    }
  }

  const handleView = async (attachment: Attachment) => {
    try {
      setLoadingStates(prev => ({ ...prev, [attachment.id]: 'viewing' }))
      
      // Get the blob URL with SAS token
      const blobUrl = await AttachmentAPI.getAttachmentBlobUrl(attachment.id)
      
      // Open in new tab
      window.open(blobUrl, '_blank')
      
    } catch (err) {
      console.error('View failed:', err)
      alert(`View failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoadingStates(prev => ({ ...prev, [attachment.id]: null }))
    }
  }

  const handleDeleteClick = (attachment: Attachment) => {
    setAttachmentToDelete(attachment)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!attachmentToDelete) return

    setDeletingId(attachmentToDelete.id)

    try {
      await AttachmentAPI.deleteAttachment(attachmentToDelete.id)
      // Remove from local state
      setAttachments(attachments.filter(a => a.id !== attachmentToDelete.id))
    } catch (err) {
      console.error('Delete failed:', err)
      alert(`Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setDeletingId(null)
      setDeleteModalOpen(false)
      setAttachmentToDelete(null)
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()

    switch (ext) {
      case 'pdf':
        return '📄'
      case 'doc':
      case 'docx':
        return '📝'
      case 'xls':
      case 'xlsx':
        return '📊'
      case 'ppt':
      case 'pptx':
        return '🎯'
      case 'txt':
        return '📋'
      case 'csv':
        return '📑'
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️'
      default:
        return '📎'
    }
  }

  const isViewable = (filename: string): boolean => {
    const viewableExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'txt']
    const ext = filename.split('.').pop()?.toLowerCase()
    return ext ? viewableExtensions.includes(ext) : false
  }

  useEffect(() => {
    fetchAttachments()
  }, [])

  if (loading) {
    return (
      <div
        className="flex-1 p-8 pt-20 md:pt-8 h-screen"
        style={{ backgroundColor: 'var(--background)' }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <svg
                className="animate-spin w-8 h-8 text-primary mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <p className="text-gray-600">Loading attachments...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex-1 p-8 pt-20 md:pt-8 min-h-screen"
      style={{ backgroundColor: 'var(--background)' }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
            My Attachments
          </h1>
          <p className="text-gray-600">
            View and manage all your uploaded attachments
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-red-600 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-red-800 font-medium">Error:</span>
              <span className="text-red-700 ml-1">{error}</span>
            </div>
            <button
              onClick={fetchAttachments}
              className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
            >
              Try again
            </button>
          </div>
        )}

        {/* Attachments List */}
        <div
          className="rounded-lg shadow-sm border border-gray-200 p-6"
          style={{ backgroundColor: 'var(--background)' }}
        >
          {attachments.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-gray-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              <p className="text-gray-500 text-lg">No attachments yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Upload attachments in the chat to see them here.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
                  Attachments ({attachments.length})
                </h2>
              </div>

              <div className="space-y-3">
                {attachments.map((attachment) => {
                  const canView = isViewable(attachment.filename)
                  const isDownloading = loadingStates[attachment.id] === 'downloading'
                  const isViewing = loadingStates[attachment.id] === 'viewing'
                  
                  return (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center min-w-0 flex-1 cursor-pointer" onClick={() => canView && handleView(attachment)}>
                        <div className="text-2xl mr-3 flex-shrink-0">
                          {getFileIcon(attachment.filename)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-medium text-gray-900 truncate hover:text-blue-600 transition-colors" title={canView ? 'Click to view' : attachment.filename}>
                            {attachment.filename}
                          </h3>
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                            <span>{formatDate(attachment.created_at)}</span>
                            <span className="text-gray-400">ID: {attachment.id.substring(0, 8)}...</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {/* View button (for viewable files) */}
                        {canView && (
                          <button
                            onClick={() => handleView(attachment)}
                            disabled={isViewing}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                            title="View attachment"
                          >
                            {isViewing ? (
                              <svg
                                className="w-4 h-4 animate-spin"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                            ) : (
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            )}
                          </button>
                        )}

                        {/* Download button */}
                        <button
                          onClick={() => handleDownload(attachment)}
                          disabled={isDownloading}
                          className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                          title="Download attachment"
                        >
                          {isDownloading ? (
                            <svg
                              className="w-4 h-4 animate-spin"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                          ) : (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                              />
                            </svg>
                          )}
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteClick(attachment)}
                          disabled={deletingId === attachment.id}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Delete attachment"
                        >
                          {deletingId === attachment.id ? (
                            <svg
                              className="w-4 h-4 animate-spin"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                          ) : (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <GenericConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Attachment"
        message={`Are you sure you want to delete "${attachmentToDelete?.filename}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}
