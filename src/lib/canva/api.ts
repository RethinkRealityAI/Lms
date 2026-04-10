const CANVA_API_BASE = 'https://api.canva.com/rest/v1';

export async function createCanvaDesign(
  accessToken: string,
  options: { width: number; height: number; title?: string }
): Promise<{ designId: string; editUrl: string }> {
  const resp = await fetch(`${CANVA_API_BASE}/designs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      design_type: {
        type: 'custom',
        width: options.width,
        height: options.height,
      },
      title: options.title ?? 'LMS Design',
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Canva create design failed: ${resp.status} ${body}`);
  }

  const data = await resp.json();
  return {
    designId: data.design.id,
    editUrl: data.design.urls.edit_url,
  };
}

export async function getCanvaDesign(
  accessToken: string,
  designId: string
): Promise<{ editUrl: string; viewUrl: string; title: string }> {
  const resp = await fetch(`${CANVA_API_BASE}/designs/${designId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Canva get design failed: ${resp.status} ${body}`);
  }

  const data = await resp.json();
  return {
    editUrl: data.design.urls.edit_url,
    viewUrl: data.design.urls.view_url,
    title: data.design.title,
  };
}

export async function exportCanvaDesign(
  accessToken: string,
  designId: string,
  format: { type: 'png' | 'pdf'; width?: number; quality?: string }
): Promise<string> {
  const exportResp = await fetch(`${CANVA_API_BASE}/exports`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      design_id: designId,
      format,
    }),
  });

  if (!exportResp.ok) {
    const body = await exportResp.text();
    throw new Error(`Canva export failed: ${exportResp.status} ${body}`);
  }

  const exportData = await exportResp.json();
  const exportId = exportData.job.id;

  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const pollResp = await fetch(`${CANVA_API_BASE}/exports/${exportId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!pollResp.ok) continue;

    const pollData = await pollResp.json();

    if (pollData.job.status === 'success') {
      return pollData.job.urls[0];
    }

    if (pollData.job.status === 'failed') {
      throw new Error('Canva export job failed');
    }
  }

  throw new Error('Canva export timed out after 60 seconds');
}

export interface CanvaDesignItem {
  id: string;
  title?: string;
  thumbnail?: { width: number; height: number; url: string };
  created_at: number;
  updated_at: number;
}

export interface CanvaFolderItem {
  type: 'design' | 'folder' | 'image';
  design?: CanvaDesignItem;
  folder?: { id: string; name: string; thumbnail?: { url: string } };
}

export async function listCanvaDesigns(
  accessToken: string,
  options?: { query?: string; limit?: number; continuation?: string }
): Promise<{ items: CanvaDesignItem[]; continuation?: string }> {
  const params = new URLSearchParams();
  if (options?.query) params.set('query', options.query);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.continuation) params.set('continuation', options.continuation);
  params.set('ownership', 'owned');
  params.set('sort_by', 'modified_descending');

  const resp = await fetch(`${CANVA_API_BASE}/designs?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Canva list designs failed: ${resp.status} ${body}`);
  }

  const data = await resp.json();
  return {
    items: data.items ?? [],
    continuation: data.continuation,
  };
}

export async function listCanvaFolderItems(
  accessToken: string,
  folderId: string,
  options?: { limit?: number; continuation?: string; itemTypes?: string }
): Promise<{ items: CanvaFolderItem[]; continuation?: string }> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.continuation) params.set('continuation', options.continuation);
  if (options?.itemTypes) params.set('item_types', options.itemTypes);
  params.set('sort_by', 'modified_descending');

  const resp = await fetch(`${CANVA_API_BASE}/folders/${folderId}/items?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Canva list folder items failed: ${resp.status} ${body}`);
  }

  const data = await resp.json();
  return {
    items: data.items ?? [],
    continuation: data.continuation,
  };
}
