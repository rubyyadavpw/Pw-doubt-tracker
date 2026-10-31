export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { token, action, batchId, subjectId, batchSubjectId } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, error: 'PW Bearer Token is required.' });
  }

  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();

  const headers = {
    'Authorization': `Bearer ${cleanToken}`,
    'client-id': '5eb393ee95fab7468a79d189',
    'client-type': 'ADMIN',
    'client-version': '1.0.0',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://admin.penpencil.co',
    'Referer': 'https://admin.penpencil.co/'
  };

  try {
    // Action 1: Get Active Batches List
    if (action === 'GET_BATCHES') {
      const batchesRes = await fetch('https://admin-api.penpencil.co/v3/admin/batches?page=1&limit=40', { headers, cache: 'no-store' });
      if (!batchesRes.ok) {
        return res.status(401).json({ success: false, error: 'Bearer Token expired or invalid.' });
      }
      const batchesData = await batchesRes.json();
      const activeBatches = (batchesData.data || []).filter(b => 
        !b.name.includes('2024') && !b.name.includes('2025')
      );
      return res.status(200).json({ success: true, batches: activeBatches });
    }

    // Action 2: Get Subjects for Single Batch
    if (action === 'GET_SUBJECTS') {
      const detailsRes = await fetch(`https://admin-api.penpencil.co/v3/admin/batches/${batchId}/details`, { headers });
      const details = await detailsRes.json();
      return res.status(200).json({ success: true, subjects: details.data?.subjects || [] });
    }

    // Action 3: Get Doubts for Single Subject
    if (action === 'GET_DOUBTS') {
      const countUrl = `https://admin-api.penpencil.co/v1/admin/doubts/subject-matter-expert/batch/${batchId}/subject/${subjectId}/get-counts?page=1&countType=CHAPTER_WISE&batchSubjectId=${batchSubjectId || ''}`;
      const countRes = await fetch(countUrl, { headers });
      const countData = await countRes.json();

      let doubts = [];
      if (countData.success && countData.data?.totalPending > 0) {
        const doubtUrl = `https://admin-api.penpencil.co/v1/admin/doubts/subject-matter-expert/batch/${batchId}/subject/${subjectId}/get-awaiting-doubts?page=1&limit=50`;
        const doubtRes = await fetch(doubtUrl, { headers });
        const doubtData = await doubtRes.json();
        if (doubtData.success && doubtData.data) {
          doubts = doubtData.data;
        }
      }
      return res.status(200).json({ success: true, doubts });
    }

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
