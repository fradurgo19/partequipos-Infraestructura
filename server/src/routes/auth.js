import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, supabase } from '../index.js';

const router = express.Router();
const USE_LOCAL_DB = process.env.USE_LOCAL_DB === 'true';

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (USE_LOCAL_DB) {
      // Autenticación con PostgreSQL local
      console.log('🔐 Intentando login con:', email);
      
      const userResult = await db.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      console.log('👤 Usuario encontrado:', userResult.rows.length > 0);

      if (userResult.rows.length === 0) {
        console.log('❌ Usuario no encontrado');
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = userResult.rows[0];
      console.log('🔑 Hash en BD:', user.password_hash);
      console.log('🔑 Password recibida:', password);

      // Verificar contraseña
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      console.log('✅ Password válida:', isValidPassword);
      
      if (!isValidPassword) {
        console.log('❌ Password incorrecta');
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Obtener perfil
      const profileResult = await db.query(
        'SELECT * FROM profiles WHERE id = $1',
        [user.id]
      );

      const profile = profileResult.rows[0];

      // Generar JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: profile.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        user: {
          id: user.id,
          email: user.email,
        },
        session: {
          access_token: token,
          expires_in: 604800, // 7 días
        },
        profile,
      });
    } else {
      // Autenticación con Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return res.status(401).json({ error: error.message });
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      res.json({
        user: data.user,
        session: data.session,
        profile,
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    if (!USE_LOCAL_DB) {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (token) {
        await supabase.auth.signOut();
      }
    }
    // En local, el logout es solo del lado del cliente
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    if (USE_LOCAL_DB) {
      // Verificar JWT token
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Obtener perfil actualizado
        const profileResult = await db.query(
          'SELECT * FROM profiles WHERE id = $1',
          [decoded.userId]
        );

        if (profileResult.rows.length === 0) {
          return res.status(401).json({ error: 'User not found' });
        }

        const profile = profileResult.rows[0];

        res.json({
          user: {
            id: decoded.userId,
            email: decoded.email,
          },
          profile,
        });
      } catch (jwtError) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    } else {
      // Verificar con Supabase
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      res.json({ user, profile });
    }
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

