export const config = {
  maxDuration: 300,
};

// Helper for delay to avoid API rate limiting
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, error: 'PW Bearer Token is required.' });
  }

  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();

  const headers = {
    'Authorization': `Bearer ${cleanToken}`,
    'client-id': '5eb393ee95fab7468a79d189',
    'client-type': 'ADMIN',
    'client-version': '1.0.0',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://admin.penpencil.co',
    'Referer': 'https://admin.penpencil.co/'
  };

  try {
    // 1. Fetch Batches Master List
    const batchesRes = await fetch('https://admin-api.penpencil.co/v3/admin/batches?page=1&limit=30', { 
      headers,
      cache: 'no-store'
    });

    if (!batchesRes.ok) {
      return res.status(401).json({ 
        success: false, 
        error: `Authentication failed (Status ${batchesRes.status}). Token expire ho chuka hai, please portal se naya Bearer token copy karein.` 
      });
    }

    const batchesData = await batchesRes.json();
    if (!batchesData.success) {
      return res.status(400).json({ success: false, error: batchesData.message || 'Failed to fetch batch master list.' });
    }

    const activeBatches = (batchesData.data || []).filter(b => 
      !b.name.includes('2024') && !b.name.includes('2025')
    );

    let allPendingDoubts = [];

    // 2. Sequential scanning with micro-delays to prevent WAF blocking
    for (const batch of activeBatches) {
      try {
        await delay(150); // Rate-limiting guard

        const detailsRes = await fetch(`https://admin-api.penpencil.co/v3/admin/batches/${batch._id}/details`, { headers });
        const details = await detailsRes.json();
        
        if (details.success && details.data?.subjects) {
          for (const subject of details.data.subjects) {
            await delay(100);

            const countUrl = `https://admin-api.penpencil.co/v1/admin/doubts/subject-matter-expert/batch/${batch._id}/subject/${subject._id}/get-counts?page=1&countType=CHAPTER_WISE&batchSubjectId=${subject.batchSubjectId || ''}`;
            const countRes = await fetch(countUrl, { headers });
            const countData = await countRes.json();

            if (countData.success && countData.data?.totalPending > 0) {
              const doubtUrl = `https://admin-api.penpencil.co/v1/admin/doubts/subject-matter-expert/batch/${batch._id}/subject/${subject._id}/get-awaiting-doubts?page=1&limit=50`;
              const doubtRes = await fetch(doubtUrl, { headers });
              const doubtData = await doubtRes.json();

              if (doubtData.success && doubtData.data) {
                const now = new Date();
                doubtData.data.forEach(d => {
                  const createdAt = new Date(d.createdAt);
                  const pendingHours = ((now - createdAt) / (1000 * 60 * 60)).toFixed(1);

                  allPendingDoubts.push({
                    doubtId: d._id || d.doubtId || 'N/A',
                    batchName: batch.name,
                    batchId: batch._id,
                    subject: subject.name,
                    chapter: d.chapterName || 'General',
                    lecture: d.lectureName || 'N/A',
                    slide: d.slideNumber || '1',
                    doubtText: d.text || d.question || 'No description provided.',
                    createdAtIST: createdAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                    pendingHours: parseFloat(pendingHours),
                    portalLink: `https://admin.penpencil.co/doubts/sme/${batch._id}/${subject._id}`
                  });
                });
              }
            }
          }
        }
      } catch (batchErr) {
        console.warn(`Skipped batch ${batch.name} due to delay.`);
      }
    }

    return res.status(200).json({
      success: true,
      lastRefreshed: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      totalCount: allPendingDoubts.length,
      doubts: allPendingDoubts
    });

  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: 'Network connection failed: ' + error.message 
    });
  }
}
