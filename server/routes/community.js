import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware as auth } from '../middleware/auth.js';
import { 
    addComment, 
    getAnalysisComments, 
    updateComment, 
    deleteComment,
    voteOnAnalysis,
    getAnalysisVotes,
    getUserVote,
    trackClaim,
    getTrendingClaims
} from '../services/commentsService.js';

const router = express.Router();

// Feature 7: Comments & Discussions
router.post('/:analysisId/comments', auth, async (req, res) => {
    try {
        const { analysisId } = req.params;
        const { content } = req.body;
        
        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Comment content required' });
        }
        
        const comment = await addComment(analysisId, req.user.id, content);
        res.json(comment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:analysisId/comments', async (req, res) => {
    try {
        const { analysisId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        
        const comments = await getAnalysisComments(analysisId, parseInt(limit), parseInt(offset));
        res.json(comments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/comments/:commentId', auth, async (req, res) => {
    try {
        const { commentId } = req.params;
        const { content } = req.body;
        
        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Comment content required' });
        }
        
        const comment = await updateComment(commentId, content);
        res.json(comment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/comments/:commentId', auth, async (req, res) => {
    try {
        const { commentId } = req.params;
        await deleteComment(commentId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Feature 6: Community Voting
router.post('/:analysisId/vote', auth, async (req, res) => {
    try {
        const { analysisId } = req.params;
        const { voteType } = req.body;
        
        if (!['helpful', 'unhelpful'].includes(voteType)) {
            return res.status(400).json({ error: 'Invalid vote type' });
        }
        
        const votes = await voteOnAnalysis(analysisId, req.user.id, voteType);
        res.json(votes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:analysisId/votes', async (req, res) => {
    try {
        const { analysisId } = req.params;
        const votes = await getAnalysisVotes(analysisId);
        res.json(votes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:analysisId/my-vote', auth, async (req, res) => {
    try {
        const { analysisId } = req.params;
        const vote = await getUserVote(analysisId, req.user.id);
        res.json(vote || null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Feature 5: Historical Claim Tracking & Trending
router.get('/trending-claims', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const claims = await getTrendingClaims(parseInt(limit));
        res.json(claims);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Feature 14: Educational Content Routes (separate router)
export function createCommunityRouter() {
    return router;
}

export default router;
