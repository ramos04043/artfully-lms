"""
Database Migration Endpoint
Creates missing views and fixes schema issues
"""
from fastapi import APIRouter, HTTPException
from app.zendbx_client import db
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/create-views")
async def create_views():
    """
    Create enrollments and fee_due views
    Run this once to fix 500 errors on /api/db/enrollments and /api/db/fee_due
    """
    try:
        # SQL to create enrollments view
        enrollments_view_sql = """
        CREATE OR REPLACE VIEW enrollments AS
        SELECT 
            sb.id,
            sb.student_id,
            s.student_id AS student_number,
            s.first_name AS student_first_name,
            s.last_name AS student_last_name,
            s.email AS student_email,
            s.phone AS student_phone,
            s.date_of_birth,
            s.gender,
            s.address,
            sb.batch_id,
            ARRAY_AGG(DISTINCT sb2.batch_id) AS batch_ids,
            sb.effective_from AS enrolled_at,
            CASE 
                WHEN sb.is_active = true AND s.status = 'ACTIVE' THEN 'ACTIVE'
                WHEN s.status = 'PAUSED' THEN 'PAUSED'
                WHEN s.status IN ('LEFT', 'INACTIVE') THEN 'INACTIVE'
                ELSE 'INACTIVE'
            END AS status,
            sb.created_at,
            sb.updated_at
        FROM student_batches sb
        INNER JOIN students s ON sb.student_id = s.id
        LEFT JOIN student_batches sb2 ON sb2.student_id = s.id AND sb2.is_active = true
        WHERE sb.is_active = true
        GROUP BY 
            sb.id, sb.student_id, s.student_id, s.first_name, s.last_name, 
            s.email, s.phone, s.date_of_birth, s.gender, s.address,
            sb.batch_id, sb.effective_from, sb.is_active, s.status, sb.created_at, sb.updated_at;
        """
        
        # SQL to create fee_due view
        fee_due_view_sql = """
        CREATE OR REPLACE VIEW fee_due AS
        SELECT * FROM fee_dues;
        """
        
        results = {}
        
        # Try to create enrollments view
        try:
            await db.rpc("exec_sql", {"query": enrollments_view_sql})
            results["enrollments_view"] = "created"
            logger.info("✅ Created enrollments view")
        except Exception as e:
            results["enrollments_view"] = f"error: {str(e)}"
            logger.error(f"❌ Failed to create enrollments view: {e}")
        
        # Try to create fee_due view
        try:
            await db.rpc("exec_sql", {"query": fee_due_view_sql})
            results["fee_due_view"] = "created"
            logger.info("✅ Created fee_due view")
        except Exception as e:
            results["fee_due_view"] = f"error: {str(e)}"
            logger.error(f"❌ Failed to create fee_due view: {e}")
        
        return {
            "success": True,
            "message": "View creation attempted",
            "results": results,
            "note": "If RPC method not available, run SQL manually in ZendBX console"
        }
        
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Migration failed: {str(e)}"
        )


@router.get("/check-views")
async def check_views():
    """
    Check if required views exist
    """
    try:
        results = {}
        
        # Check enrollments view
        try:
            data = await db.select(
                table="enrollments",
                columns="id",
                limit=1
            )
            results["enrollments"] = {
                "exists": True,
                "sample_count": len(data)
            }
        except Exception as e:
            results["enrollments"] = {
                "exists": False,
                "error": str(e)
            }
        
        # Check fee_due view
        try:
            data = await db.select(
                table="fee_due",
                columns="id",
                limit=1
            )
            results["fee_due"] = {
                "exists": True,
                "sample_count": len(data)
            }
        except Exception as e:
            results["fee_due"] = {
                "exists": False,
                "error": str(e)
            }
        
        # Check underlying tables
        try:
            data = await db.select(
                table="student_batches",
                columns="id",
                limit=1
            )
            results["student_batches"] = {
                "exists": True,
                "sample_count": len(data)
            }
        except Exception as e:
            results["student_batches"] = {
                "exists": False,
                "error": str(e)
            }
        
        try:
            data = await db.select(
                table="fee_dues",
                columns="id",
                limit=1
            )
            results["fee_dues"] = {
                "exists": True,
                "sample_count": len(data)
            }
        except Exception as e:
            results["fee_dues"] = {
                "exists": False,
                "error": str(e)
            }
        
        all_exist = (
            results.get("enrollments", {}).get("exists", False) and
            results.get("fee_due", {}).get("exists", False)
        )
        
        return {
            "all_views_exist": all_exist,
            "details": results,
            "action_required": not all_exist,
            "next_step": "Run POST /api/migrations/create-views or execute SQL manually in ZendBX console" if not all_exist else "No action needed"
        }
        
    except Exception as e:
        logger.error(f"View check failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"View check failed: {str(e)}"
        )
