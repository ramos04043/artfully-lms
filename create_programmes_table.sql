-- Create programmes table
-- Programmes define the different art programs (Foundation, Advanced, etc.)

CREATE TABLE IF NOT EXISTS proj_b2d90696.programmes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    programme_type TEXT NOT NULL, -- 'FOUNDATION' or 'ADVANCED'
    duration_months INTEGER,
    fee_amount DECIMAL(10, 2),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_programmes_type ON proj_b2d90696.programmes(programme_type);
CREATE INDEX IF NOT EXISTS idx_programmes_active ON proj_b2d90696.programmes(is_active);

-- Insert default programmes
INSERT INTO proj_b2d90696.programmes (name, description, programme_type, duration_months, fee_amount, is_active)
VALUES 
    ('Foundation Art Program', 'Basic art skills and techniques for beginners', 'FOUNDATION', 12, 5000.00, true),
    ('Advanced Art Program', 'Advanced techniques and portfolio development', 'ADVANCED', 12, 7000.00, true)
ON CONFLICT DO NOTHING;

-- Verify the data
SELECT 
    id,
    name,
    programme_type,
    fee_amount,
    is_active,
    created_at
FROM proj_b2d90696.programmes
ORDER BY programme_type, name;
