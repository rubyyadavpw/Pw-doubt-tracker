export const config = {
  maxDuration: 300,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: 'PW Portal Token required' });
  }

  const headers = {
    'Authorization': `Bearer ${token.replace(/^Bearer\s+/, '').trim()}`,
    'client-id': '5eb393ee95fab7468a79d189',
    'client-type': 'ADMIN',
    'client-version': '1.0.0',
    'Accept': 'application/json'
  };

  try {
    const batchesRes = await fetch('https://admin-api.penpencil.co/v3/admin/batches?page=1&limit=1000', { headers });
    const batchesData = await batchesRes.json();

    if (!batchesData.success) {
      throw new Error('Failed to fetch batch master list');
    }

    const activeBatches = (batchesData.data || []).filter(b => 
      !b.name.includes('2024') && !b.name.includes('2025')
    );

    let allPendingDoubts = [];

    const batchPromises = activeBatches.map(async (batch) => {
      try {
        const detailsRes = await fetch(`https://admin-api.penpencil.co/v3/admin/batches/${batch._id}/details`, { headers });
        const details = await detailsRes.json();
        
        if (details.success && details.data?.subjects) {
          for (const subject of details.data.subjects) {
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
                    doubtId: d._id || d.doubtId,
                    batchName: batch.name,
                    batchId: batch._id,
                    subject: subject.name,
                    chapter: d.chapterName || 'N/A',
                    lecture: d.lectureName || 'N/A',
                    slide: d.slideNumber || '1',
                    doubtText: d.text || d.question || 'No Text',
                    category: d.category || 'General',
                    createdAtIST: createdAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                    pendingHours: parseFloat(pendingHours),
                    portalLink: `https://admin.penpencil.co/doubts/sme/${batch._id}/${subject._id}`,
                    lastRefreshedIST: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                  });
                });
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error processing batch ${batch.name}:`, err.message);
      }
    });

    await Promise.all(batchPromises);

    return res.status(200).json({
      success: true,
      lastRefreshed: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      totalCount: allPendingDoubts.length,
      doubts: allPendingDoubts
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
