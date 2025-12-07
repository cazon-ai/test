const { Pool } = require('pg');

// Configure connection pool with proper timeouts
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

/**
 * Query with retry logic and exponential backoff
 * @param {string} query - SQL query to execute
 * @param {Array} params - Query parameters
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise} Query result
 */
async function queryWithRetry(query, params, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await pool.query(query, params);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      // Exponential backoff: wait 1s, 2s, 3s
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

class UserRepository {
  /**
   * Find user by ID with retry logic
   * @param {string} userId - User ID to find
   * @returns {Promise} User object or null
   */
  async findById(userId) {
    try {
      const query = 'SELECT * FROM users WHERE id = $1';
      const result = await queryWithRetry(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      throw error;
    }
  }

  /**
   * Find all users with retry logic
   * @returns {Promise} Array of user objects
   */
  async findAll() {
    try {
      const query = 'SELECT * FROM users';
      const result = await queryWithRetry(query, []);
      return result.rows;
    } catch (error) {
      console.error('Error fetching all users:', error);
      throw error;
    }
  }

  /**
   * Create new user with retry logic
   * @param {Object} userData - User data to insert
   * @returns {Promise} Created user object
   */
  async create(userData) {
    if (!userData || !userData.name || !userData.email) {
      throw new Error('User data must include name and email');
    }
    try {
      const query = 'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *';
      const result = await queryWithRetry(query, [userData.name, userData.email]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update user with retry logic
   * @param {string} userId - User ID to update
   * @param {Object} userData - User data to update
   * @returns {Promise} Updated user object
   */
  async update(userId, userData) {
    if (!userData || (!userData.name && !userData.email)) {
      throw new Error('User data must include at least name or email to update');
    }
    try {
      // Build dynamic update query for partial updates
      const updates = [];
      const values = [];
      let paramCount = 1;
      
      if (userData.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(userData.name);
      }
      if (userData.email !== undefined) {
        updates.push(`email = $${paramCount++}`);
        values.push(userData.email);
      }
      
      values.push(userId);
      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      const result = await queryWithRetry(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete user with retry logic
   * @param {string} userId - User ID to delete
   * @returns {Promise} Deleted user object
   */
  async delete(userId) {
    try {
      const query = 'DELETE FROM users WHERE id = $1 RETURNING *';
      const result = await queryWithRetry(query, [userId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  await pool.end();
});

process.on('SIGINT', async () => {
  await pool.end();
});

module.exports = new UserRepository();
