// Script Node.js para crear usuarios usando Supabase Admin API
// Ejecutar con: node create-users-admin.js
// Requiere: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const users = [
  {
    email: 'edison.valencia@partequipos.com',
    password: 'Edison123!', // Cambiar por una contraseña segura
    full_name: 'Edison Valencia',
    role: 'infrastructure',
    department: 'Infraestructura'
  },
  {
    email: 'eloisa.blando@partequipos.com',
    password: 'Eloisa123!', // Cambiar por una contraseña segura
    full_name: 'Eloísa Blando',
    role: 'infrastructure',
    department: 'Infraestructura'
  },
  {
    email: 'felipe.bustamante@partequipos.com',
    password: 'Felipe123!', // Cambiar por una contraseña segura
    full_name: 'Felipe Bustamante',
    role: 'infrastructure',
    department: 'Infraestructura'
  }
];

async function createUsers() {
  console.log('🚀 Creando usuarios de infraestructura...\n');

  for (const userData of users) {
    try {
      console.log(`📧 Creando usuario: ${userData.email}`);
      
      // Crear usuario en Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true, // Confirmar email automáticamente
        user_metadata: {
          full_name: userData.full_name,
          role: userData.role
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`⚠️  Usuario ${userData.email} ya existe, actualizando perfil...`);
          
          // Buscar usuario existente
          const { data: existingUser } = await supabase.auth.admin.listUsers();
          const user = existingUser.users.find(u => u.email === userData.email);
          
          if (user) {
            // Actualizar perfil
            const { error: profileError } = await supabase
              .from('profiles')
              .update({
                full_name: userData.full_name,
                role: userData.role,
                department: userData.department
              })
              .eq('id', user.id);

            if (profileError) {
              console.error(`❌ Error actualizando perfil: ${profileError.message}`);
            } else {
              console.log(`✅ Perfil actualizado para ${userData.email}`);
            }
          }
        } else {
          console.error(`❌ Error creando usuario: ${authError.message}`);
        }
        continue;
      }

      if (authData.user) {
        console.log(`✅ Usuario creado: ${authData.user.email} (ID: ${authData.user.id})`);
        
        // El trigger debería crear el perfil automáticamente, pero lo verificamos
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (profileError || !profile) {
          // Si no existe el perfil, crearlo manualmente
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: userData.email,
              full_name: userData.full_name,
              role: userData.role,
              department: userData.department
            });

          if (insertError) {
            console.error(`❌ Error creando perfil: ${insertError.message}`);
          } else {
            console.log(`✅ Perfil creado para ${userData.email}`);
          }
        } else {
          // Actualizar perfil existente
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              full_name: userData.full_name,
              role: userData.role,
              department: userData.department
            })
            .eq('id', authData.user.id);

          if (updateError) {
            console.error(`❌ Error actualizando perfil: ${updateError.message}`);
          } else {
            console.log(`✅ Perfil actualizado para ${userData.email}`);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error procesando ${userData.email}:`, error.message);
    }
    
    console.log(''); // Línea en blanco
  }

  console.log('✨ Proceso completado!');
  console.log('\n📋 Usuarios creados:');
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'infrastructure')
    .order('full_name');

  if (profiles) {
    profiles.forEach(profile => {
      console.log(`  - ${profile.full_name} (${profile.email})`);
    });
  }
}

createUsers().catch(console.error);

