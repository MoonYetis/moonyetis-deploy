const express = require('express');
const router = express.Router();

// GET /api/leaderboard - Get global rankings
router.get('/', async (req, res) => {
    try {
        const { db } = req.app.locals;
        
        // Get top 50 players by different metrics
        const limit = parseInt(req.query.limit) || 50;
        const sortBy = req.query.sort || 'total_wagered'; // total_wagered, biggest_win, profit_loss
        
        let orderClause;
        switch (sortBy) {
            case 'biggest_win':
                orderClause = 'biggest_win DESC';
                break;
            case 'profit_loss':
                orderClause = 'profit_loss DESC';
                break;
            case 'total_spins':
                orderClause = 'total_spins DESC';
                break;
            case 'total_won':
                orderClause = 'total_won DESC';
                break;
            default:
                orderClause = 'total_wagered DESC';
        }
        
        const query = `
            SELECT 
                wallet_address,
                total_wagered,
                total_won,
                biggest_win,
                total_spins,
                profit_loss,
                last_active,
                ROW_NUMBER() OVER (ORDER BY ${orderClause}) as rank
            FROM leaderboard 
            ORDER BY ${orderClause}
            LIMIT $1
        `;
        
        const result = await db.query(query, [limit]);
        
        res.json({
            success: true,
            data: {
                leaderboard: result.rows,
                sort_by: sortBy,
                total_players: result.rows.length
            }
        });
        
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch leaderboard data'
        });
    }
});

// POST /api/leaderboard/update - Update player stats
router.post('/update', async (req, res) => {
    try {
        const { db } = req.app.locals;
        const { 
            wallet_address, 
            bet_amount, 
            win_amount, 
            is_win 
        } = req.body;
        
        if (!wallet_address || bet_amount === undefined) {
            return res.status(400).json({
                success: false,
                error: 'wallet_address and bet_amount are required'
            });
        }
        
        const winAmount = win_amount || 0;
        const profitLoss = winAmount - bet_amount;
        
        // Upsert player stats
        const query = `
            INSERT INTO leaderboard (
                wallet_address, 
                total_wagered, 
                total_won, 
                biggest_win, 
                total_spins, 
                profit_loss,
                last_active
            ) VALUES ($1, $2, $3, $4, 1, $5, NOW())
            ON CONFLICT (wallet_address) 
            DO UPDATE SET
                total_wagered = leaderboard.total_wagered + $2,
                total_won = leaderboard.total_won + $3,
                biggest_win = GREATEST(leaderboard.biggest_win, $4),
                total_spins = leaderboard.total_spins + 1,
                profit_loss = leaderboard.profit_loss + $5,
                last_active = NOW()
            RETURNING *
        `;
        
        const result = await db.query(query, [
            wallet_address,
            bet_amount,
            winAmount,
            winAmount, // biggest_win candidate
            profitLoss
        ]);
        
        res.json({
            success: true,
            data: {
                player: result.rows[0],
                spin_result: {
                    bet: bet_amount,
                    win: winAmount,
                    profit: profitLoss,
                    is_win: is_win
                }
            }
        });
        
    } catch (error) {
        console.error('Error updating leaderboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update player statistics'
        });
    }
});

// GET /api/leaderboard/player/:wallet - Get specific player stats
router.get('/player/:wallet', async (req, res) => {
    try {
        const { db } = req.app.locals;
        const walletAddress = req.params.wallet;
        
        const query = `
            SELECT 
                *,
                (SELECT COUNT(*) + 1 FROM leaderboard l2 WHERE l2.total_wagered > l1.total_wagered) as rank_by_wagered,
                (SELECT COUNT(*) + 1 FROM leaderboard l2 WHERE l2.biggest_win > l1.biggest_win) as rank_by_biggest_win,
                (SELECT COUNT(*) + 1 FROM leaderboard l2 WHERE l2.profit_loss > l1.profit_loss) as rank_by_profit
            FROM leaderboard l1 
            WHERE wallet_address = $1
        `;
        
        const result = await db.query(query, [walletAddress]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Player not found in leaderboard'
            });
        }
        
        res.json({
            success: true,
            data: {
                player: result.rows[0]
            }
        });
        
    } catch (error) {
        console.error('Error fetching player stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch player statistics'
        });
    }
});

module.exports = router;