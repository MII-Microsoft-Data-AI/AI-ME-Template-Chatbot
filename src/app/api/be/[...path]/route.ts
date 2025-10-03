import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/auth'
import { getBackendUrl, getBackendAuthHeaders } from '@/lib/integration/server'
// import { DataStreamResponse } from "assistant-stream";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params
  return handleProxyRequest(request, resolvedParams, 'GET')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params
  return handleProxyRequest(request, resolvedParams, 'POST')
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params
  return handleProxyRequest(request, resolvedParams, 'PUT')
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params
  return handleProxyRequest(request, resolvedParams, 'DELETE')
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params
  return handleProxyRequest(request, resolvedParams, 'PATCH')
}

async function handleProxyRequest(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  try {
    // Get authenticated user session
    const session = await getAuthSession()
    
    // Construct the backend path
    const backendPath = '/' + params.path.join('/')
    const backendUrl = await getBackendUrl()
    const fullBackendUrl = `${backendUrl}${backendPath}`
    
    // Copy search parameters from the original request
    const url = new URL(request.url)
    const searchParams = url.searchParams
    const finalUrl = searchParams.toString() 
      ? `${fullBackendUrl}?${searchParams.toString()}`
      : fullBackendUrl

    // Prepare headers - start with backend auth headers
    const headers = await getBackendAuthHeaders()

    // Add UserID header if user is authenticated
    if (session?.user?.id) {
      headers['UserID'] = session.user.id
    }

    [...(request.headers.keys())].forEach(headerName => {
      const headerValue = request.headers.get(headerName)
      if (headerValue) {
        headers[headerName] = headerValue
      }
    })

    let body = undefined
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      // Use blob() instead of arrayBuffer() to avoid detachment issues with multipart/form-data
      const blob = await request.blob()
      body = blob
    }

    // Make the request to the backend
    const response = await fetch(finalUrl, {
      method: method,
      headers: headers,
      body: body
    })

    // Create response headers, excluding some that shouldn't be forwarded
    const responseHeaders = new Headers()
    const headersToExclude = [
      'connection',
      'content-encoding',
      'content-length',
      'keep-alive',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailers',
      'transfer-encoding',
      'upgrade',
    ]

    response.headers.forEach((value, key) => {
      if (!headersToExclude.includes(key.toLowerCase())) {
        responseHeaders.set(key, value)
      }
    })

    // Handle streaming responses
    const contentType = response.headers.get('content-type')
    const transferEncoding = response.headers.get('transfer-encoding')
    if (contentType?.includes('text/stream') || contentType?.includes('application/stream') || contentType?.includes('text/event-stream') || transferEncoding === 'chunked') {
      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      })
    }

    // For non-streaming responses, get the response body
    const responseBody = await response.text()

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })

  } catch (error) {
    console.error('Proxy request failed:', error)
    
    return NextResponse.json(
      {
        error: 'Proxy request failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}