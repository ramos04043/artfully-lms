"""
Database Proxy API Endpoints
Routes frontend database requests through backend to avoid CORS issues
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict, Any, List
from app.zendbx_client import db
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/{table}")
async def get_table_data(
    table: str,
    select: str = "*",
    limit: Optional[int] = None,
    order: Optional[str] = None,
    filters: Optional[str] = None
):
    """
    Generic GET endpoint for any table
    
    Query params:
    - select: columns to select (comma-separated)
    - limit: max number of results
    - order: order by column (e.g., 'created_at.desc')
    - filters: JSON string of filters (e.g., '{"status":"ACTIVE"}')
    """
    try:
        import json
        
        # Parse filters if provided
        filter_dict = None
        if filters:
            try:
                filter_dict = json.loads(filters)
            except:
                # Try parsing as simple key=value pairs
                filter_dict = {}
                for pair in filters.split(','):
                    if '=' in pair:
                        key, value = pair.split('=', 1)
                        filter_dict[key.strip()] = value.strip()
        
        # Query database
        result = await db.select(
            table=table,
            columns=select,
            filters=filter_dict,
            order_by=order,
            limit=limit
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error querying {table}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{table}")
async def insert_table_data(
    table: str,
    data: Dict[str, Any] | List[Dict[str, Any]]
):
    """
    Generic POST endpoint to insert data into any table
    """
    try:
        result = await db.insert(
            table=table,
            data=data
        )
        return result
        
    except Exception as e:
        logger.error(f"Error inserting into {table}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{table}")
async def update_table_data(
    table: str,
    data: Dict[str, Any],
    filters: str
):
    """
    Generic PATCH endpoint to update data in any table
    
    Query params:
    - filters: JSON string of filters (e.g., '{"id":"uuid-here"}')
    """
    try:
        import json
        
        # Parse filters
        filter_dict = json.loads(filters) if isinstance(filters, str) else filters
        
        result = await db.update(
            table=table,
            data=data,
            filters=filter_dict
        )
        return result
        
    except Exception as e:
        logger.error(f"Error updating {table}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{table}")
async def delete_table_data(
    table: str,
    filters: str
):
    """
    Generic DELETE endpoint to delete data from any table
    
    Query params:
    - filters: JSON string of filters (e.g., '{"id":"uuid-here"}')
    """
    try:
        import json
        
        # Parse filters
        filter_dict = json.loads(filters) if isinstance(filters, str) else filters
        
        await db.delete(
            table=table,
            filters=filter_dict
        )
        return {"success": True, "message": f"Deleted from {table}"}
        
    except Exception as e:
        logger.error(f"Error deleting from {table}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rpc/{function_name}")
async def call_rpc_function(
    function_name: str,
    params: Optional[Dict[str, Any]] = None
):
    """
    Call a PostgreSQL function via RPC
    """
    try:
        result = await db.rpc(
            function_name=function_name,
            params=params
        )
        return result
        
    except Exception as e:
        logger.error(f"Error calling RPC {function_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
