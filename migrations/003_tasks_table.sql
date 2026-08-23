-- ============================================================================
-- TASKS TABLE MIGRATION
-- ============================================================================
-- Purpose: Create tasks management table for tracking work items
-- ============================================================================

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_name VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    status VARCHAR(20) NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    assigned_to VARCHAR(100),  -- Simple text field for assignee name (Sajith or Akshaya)
    created_by VARCHAR(100),   -- Simple text field for creator name
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

-- Add comments
COMMENT ON TABLE tasks IS 'Task management table for tracking work items and assignments';
COMMENT ON COLUMN tasks.task_name IS 'Name/title of the task';
COMMENT ON COLUMN tasks.description IS 'Detailed description of the task';
COMMENT ON COLUMN tasks.priority IS 'Task priority: LOW, MEDIUM, HIGH, URGENT';
COMMENT ON COLUMN tasks.status IS 'Task status: TODO, IN_PROGRESS, COMPLETED, CANCELLED';
COMMENT ON COLUMN tasks.assigned_to IS 'Name of person assigned to this task (Sajith or Akshaya)';
COMMENT ON COLUMN tasks.created_by IS 'Name of person who created this task';
COMMENT ON COLUMN tasks.due_date IS 'Due date for task completion';
COMMENT ON COLUMN tasks.completed_at IS 'Timestamp when task was marked as completed';

-- ============================================================================
-- END OF TASKS TABLE MIGRATION
-- ============================================================================
