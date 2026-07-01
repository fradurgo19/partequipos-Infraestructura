import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabaseClient.js';
import { getPagosTable } from './transforms.js';

const PAGOS_TABLE = getPagosTable();
const INFRA_SYNC_LOCATION = 'Infraestructura';

const buildUnusablePasswordHash = async () => {
  const random = crypto.randomBytes(32).toString('hex');
  return bcrypt.hash(`__infra_no_pagos_login__${random}`, 10);
};

const findPagosProfileIdById = async (userId) => {
  const { data } = await supabase.from(PAGOS_TABLE).select('id').eq('id', userId).maybeSingle();
  return data?.id ?? null;
};

const findPagosProfileIdByEmail = async (email) => {
  const trimmed = email?.trim();
  if (!trimmed) return null;

  const { data } = await supabase
    .from(PAGOS_TABLE)
    .select('id')
    .ilike('email', trimmed)
    .maybeSingle();

  return data?.id ?? null;
};

const syncInfraAdminPagosProfile = async (pagosUser) => {
  const passwordHash = await buildUnusablePasswordHash();
  const row = {
    id: pagosUser.id,
    email: pagosUser.email,
    full_name: pagosUser.fullName || pagosUser.email,
    role: pagosUser.role || 'area_coordinator',
    location: INFRA_SYNC_LOCATION,
    password_hash: passwordHash,
  };

  const { data, error } = await supabase.from(PAGOS_TABLE).insert(row).select('id').single();

  if (!error) {
    return data.id;
  }

  const existingId = await findPagosProfileIdById(pagosUser.id);
  if (existingId) {
    return existingId;
  }

  const byEmailId = await findPagosProfileIdByEmail(pagosUser.email);
  if (byEmailId) {
    return byEmailId;
  }

  console.error('Error al sincronizar perfil pagos para admin infra:', error);
  const syncError = new Error('No se pudo vincular el perfil de pagos');
  syncError.statusCode = 500;
  throw syncError;
};

/**
 * Devuelve un id válido en pagos_profiles para FKs (utility_bills.user_id, approved_by, etc.).
 * Usuarios JWT pagos ya existen en la tabla; admins de infra se sincronizan bajo demanda.
 */
export const resolvePagosProfileId = async (pagosUser) => {
  if (!pagosUser) {
    const error = new Error('Usuario no identificado');
    error.statusCode = 401;
    throw error;
  }

  if (pagosUser.id) {
    const byId = await findPagosProfileIdById(pagosUser.id);
    if (byId) {
      return byId;
    }
  }

  const byEmail = await findPagosProfileIdByEmail(pagosUser.email);
  if (byEmail) {
    return byEmail;
  }

  if (pagosUser.infraAdmin) {
    return syncInfraAdminPagosProfile(pagosUser);
  }

  const notFound = new Error('Perfil de pagos no encontrado');
  notFound.statusCode = 404;
  throw notFound;
};

export const attachPagosProfileId = async (pagosUser) => {
  const profileId = await resolvePagosProfileId(pagosUser);
  return { ...pagosUser, id: profileId };
};
