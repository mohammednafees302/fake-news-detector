import { v4 as uuidv4 } from 'uuid';
import { queryAll, queryOne, runStmt } from '../database/init.js';

// Feature 7: User Comments & Discussions
export async function addComment(analysisId, userId, content) {
    const id = uuidv4();
    await runStmt(
        'INSERT INTO comments (id, analysis_id, user_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, analysisId, userId, content, new Date().toISOString(), new Date().toISOString()]
    );
    return getComment(id);
}

export async function getComment(commentId) {
    return queryOne(
        `SELECT c.*, u.username, u.avatar_color FROM comments c 
         LEFT JOIN users u ON c.user_id = u.id WHERE c.id = ?`,
        [commentId]
    );
}

export async function getAnalysisComments(analysisId, limit = 50, offset = 0) {
    return queryAll(
        `SELECT c.*, u.username, u.avatar_color FROM comments c 
         LEFT JOIN users u ON c.user_id = u.id 
         WHERE c.analysis_id = ? 
         ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
        [analysisId, limit, offset]
    );
}

export async function updateComment(commentId, content) {
    await runStmt(
        'UPDATE comments SET content = ?, updated_at = ? WHERE id = ?',
        [content, new Date().toISOString(), commentId]
    );
    return getComment(commentId);
}

export async function deleteComment(commentId) {
    await runStmt('DELETE FROM comments WHERE id = ?', [commentId]);
}

// Feature 6: Community Voting System
export async function voteOnAnalysis(analysisId, userId, voteType) {
    const id = uuidv4();
    try {
        await runStmt(
            'INSERT INTO analysis_votes (id, analysis_id, user_id, vote_type, created_at) VALUES (?, ?, ?, ?, ?)',
            [id, analysisId, userId, voteType, new Date().toISOString()]
        );
    } catch (err) {
        // Update existing vote
        await runStmt(
            'UPDATE analysis_votes SET vote_type = ? WHERE analysis_id = ? AND user_id = ?',
            [voteType, analysisId, userId]
        );
    }
    return getAnalysisVotes(analysisId);
}

export async function getAnalysisVotes(analysisId) {
    const votes = await queryAll(
        'SELECT vote_type, COUNT(*) as count FROM analysis_votes WHERE analysis_id = ? GROUP BY vote_type',
        [analysisId]
    );
    
    const helpful = votes.find(v => v.vote_type === 'helpful')?.count || 0;
    const unhelpful = votes.find(v => v.vote_type === 'unhelpful')?.count || 0;
    
    return { helpful, unhelpful, total: helpful + unhelpful };
}

export async function getUserVote(analysisId, userId) {
    return queryOne(
        'SELECT vote_type FROM analysis_votes WHERE analysis_id = ? AND user_id = ?',
        [analysisId, userId]
    );
}

// Feature 5: Historical Claim Tracking
export async function trackClaim(claimText, analysisId) {
    const existing = await queryOne(
        'SELECT id FROM claim_history WHERE claim_text = ?',
        [claimText]
    );
    
    if (existing) {
        await runStmt(
            'UPDATE claim_history SET occurrences = occurrences + 1, last_updated = ? WHERE id = ?',
            [new Date().toISOString(), existing.id]
        );
        return existing.id;
    }
    
    const id = uuidv4();
    await runStmt(
        'INSERT INTO claim_history (id, claim_text, analysis_id, first_seen, last_updated, occurrences) VALUES (?, ?, ?, ?, ?, ?)',
        [id, claimText, analysisId, new Date().toISOString(), new Date().toISOString(), 1]
    );
    return id;
}

export async function getClaimHistory(claimText) {
    return queryOne(
        'SELECT * FROM claim_history WHERE claim_text = ? ORDER BY last_updated DESC',
        [claimText]
    );
}

export async function getTrendingClaims(limit = 10) {
    return queryAll(
        'SELECT claim_text, occurrences, last_updated FROM claim_history ORDER BY occurrences DESC, last_updated DESC LIMIT ?',
        [limit]
    );
}
