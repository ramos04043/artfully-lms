/**
 * ZendBX SDK Usage Examples
 * 
 * This file contains examples of how to use the ZendBX SDK
 * for common operations in your LMS application.
 */

import { db, table } from './zendbx';

// ============================================================================
// DATABASE QUERIES
// ============================================================================

/**
 * Example: Fetch all students
 */
export const getAllStudents = async () => {
  const { data, error } = await db.from('students').select('*');
  
  if (error) {
    console.error('Error fetching students:', error);
    return [];
  }
  
  return data || [];
};

/**
 * Example: Get active students with filters and sorting
 */
export const getActiveStudents = async () => {
  const { data, error } = await db
    .from('students')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) {
    console.error('Error:', error);
    return [];
  }
  
  return data || [];
};

/**
 * Example: Get student by ID
 */
export const getStudentById = async (studentId: string) => {
  const { data, error } = await db
    .from('students')
    .select('*')
    .eq('id', studentId)
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
    return null;
  }
  
  return data?.[0] || null;
};

/**
 * Example: Create a new student
 */
export const createStudent = async (studentData: {
  name: string;
  email: string;
  phone?: string;
  status?: string;
}) => {
  const { data, error } = await db.from('students').insert({
    ...studentData,
    status: studentData.status || 'active',
  });
  
  if (error) {
    console.error('Error creating student:', error);
    return { success: false, error };
  }
  
  return { success: true, data };
};

/**
 * Example: Update student information
 */
export const updateStudent = async (
  studentId: string,
  updates: Partial<{ name: string; email: string; phone: string; status: string }>
) => {
  const { data, error } = await db
    .from('students')
    .update(updates)
    .eq('id', studentId);
  
  if (error) {
    console.error('Error updating student:', error);
    return { success: false, error };
  }
  
  return { success: true, data };
};

/**
 * Example: Delete a student
 */
export const deleteStudent = async (studentId: string) => {
  const { data, error } = await db
    .from('students')
    .delete()
    .eq('id', studentId);
  
  if (error) {
    console.error('Error deleting student:', error);
    return { success: false, error };
  }
  
  return { success: true, data };
};

// ============================================================================
// BATCH MANAGEMENT
// ============================================================================

/**
 * Example: Get all batches with enrollment counts
 */
export const getBatchesWithEnrollments = async () => {
  const { data, error } = await db
    .from('batches')
    .select('*, enrollments(count)');
  
  if (error) {
    console.error('Error:', error);
    return [];
  }
  
  return data || [];
};

/**
 * Example: Enroll student in a batch
 */
export const enrollStudentInBatch = async (
  studentId: string,
  batchId: string
) => {
  const { data, error } = await db.from('enrollments').insert({
    student_id: studentId,
    batch_id: batchId,
    enrollment_date: new Date().toISOString(),
    status: 'active',
  });
  
  if (error) {
    console.error('Error enrolling student:', error);
    return { success: false, error };
  }
  
  return { success: true, data };
};

// ============================================================================
// SEARCH AND FILTERING
// ============================================================================

/**
 * Example: Search students by name or email
 */
export const searchStudents = async (query: string) => {
  const { data, error } = await db
    .from('students')
    .select('*')
    .ilike('name', `%${query}%`)
    // You can also use .or() for multiple conditions
    // .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(20);
  
  if (error) {
    console.error('Error searching students:', error);
    return [];
  }
  
  return data || [];
};

// ============================================================================
// FILE STORAGE
// ============================================================================

/**
 * Example: Upload student document
 */
export const uploadStudentDocument = async (
  file: File,
  studentId: string
) => {
  const bucket = db.storage.bucket('student-documents');
  const fileName = `${studentId}/${Date.now()}-${file.name}`;
  
  const { data, error } = await bucket.upload(file, fileName);
  
  if (error) {
    console.error('Error uploading file:', error);
    return { success: false, error };
  }
  
  return { success: true, data };
};

/**
 * Example: List student documents
 */
export const listStudentDocuments = async (studentId: string) => {
  const bucket = db.storage.bucket('student-documents');
  
  const { data, error } = await bucket.list({
    search: studentId,
  });
  
  if (error) {
    console.error('Error listing files:', error);
    return [];
  }
  
  return data || [];
};

/**
 * Example: Create signed URL for document download
 */
export const getDocumentDownloadUrl = async (fileId: string) => {
  const bucket = db.storage.bucket('student-documents');
  
  const { data, error } = await bucket.createSignedUrl(fileId, '1h');
  
  if (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }
  
  return data?.url || null;
};

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

/**
 * Example: Subscribe to new student enrollments
 */
export const subscribeToEnrollments = (
  onNewEnrollment: (enrollment: any) => void
) => {
  const subscription = db.realtime
    .from('enrollments')
    .on('INSERT', (payload) => {
      console.log('New enrollment:', payload.new);
      onNewEnrollment(payload.new);
    })
    .subscribe();
  
  // Return unsubscribe function
  return () => subscription.unsubscribe();
};

/**
 * Example: Subscribe to attendance updates
 */
export const subscribeToAttendance = (
  sessionId: string,
  onUpdate: (attendance: any) => void
) => {
  const subscription = db.realtime
    .from('attendance')
    .on('*', (payload) => {
      if (payload.new?.session_id === sessionId) {
        onUpdate(payload.new);
      }
    })
    .subscribe();
  
  return () => subscription.unsubscribe();
};

// ============================================================================
// COMPLEX QUERIES
// ============================================================================

/**
 * Example: Get student's complete profile with enrollments and payments
 */
export const getStudentProfile = async (studentId: string) => {
  // Fetch student data
  const { data: student, error: studentError } = await db
    .from('students')
    .select('*')
    .eq('id', studentId)
    .limit(1);
  
  if (studentError || !student?.[0]) {
    return null;
  }
  
  // Fetch enrollments
  const { data: enrollments } = await db
    .from('enrollments')
    .select('*, batches(*)')
    .eq('student_id', studentId);
  
  // Fetch payments
  const { data: payments } = await db
    .from('payments')
    .select('*')
    .eq('student_id', studentId)
    .order('payment_date', { ascending: false });
  
  return {
    ...student[0],
    enrollments: enrollments || [],
    payments: payments || [],
  };
};

/**
 * Example: Get batch analytics
 */
export const getBatchAnalytics = async (batchId: string) => {
  const { data: enrollments } = await db
    .from('enrollments')
    .select('*, students(*)')
    .eq('batch_id', batchId);
  
  const { data: sessions } = await db
    .from('sessions')
    .select('*')
    .eq('batch_id', batchId);
  
  const { data: attendance } = await db
    .from('attendance')
    .select('*')
    .eq('batch_id', batchId);
  
  return {
    totalStudents: enrollments?.length || 0,
    totalSessions: sessions?.length || 0,
    averageAttendance: attendance?.length || 0,
    enrollments: enrollments || [],
  };
};
