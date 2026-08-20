"""
ZendBX Database Client
Handles all database operations using ZendBX REST API
"""
import httpx
from typing import Optional, Dict, List, Any
from app.core.config import settings


class ZendBXClient:
    """ZendBX database client using REST API"""
    
    def __init__(self):
        self.anon_key = settings.ZENDBX_ANON_KEY
        self.service_key = settings.ZENDBX_SERVICE_KEY
        self.base_url = f"{settings.ZENDBX_URL}/p/{self._extract_project_slug()}/v1/rest"
        
    def _extract_project_slug(self) -> str:
        """Extract project slug from anon key JWT payload"""
        import json
        import base64
        
        try:
            # JWT format: header.payload.signature
            parts = self.anon_key.split('.')
            if len(parts) >= 2:
                # Decode payload (add padding if needed)
                payload = parts[1]
                payload += '=' * (4 - len(payload) % 4)
                decoded = base64.b64decode(payload)
                data = json.loads(decoded)
                return data.get('project_slug', 'artschoollms')
        except Exception as e:
            print(f"Warning: Could not extract project slug: {e}")
            return 'artschoollms'
    
    def _get_headers(self, use_service_key: bool = False) -> Dict[str, str]:
        """Get headers for API requests"""
        key = self.service_key if use_service_key else self.anon_key
        return {
            'Content-Type': 'application/json',
            'apikey': key,
            'Authorization': f'Bearer {key}'
        }
    
    async def select(
        self, 
        table: str, 
        columns: str = '*',
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Select data from table
        
        Args:
            table: Table name
            columns: Columns to select (comma-separated)
            filters: Filter conditions as dict (e.g., {'status': 'ACTIVE', 'age_gte': 18})
            order_by: Order by column (e.g., 'created_at.desc')
            limit: Limit number of results
        """
        url = f"{self.base_url}/{table}"
        params = {'select': columns}
        
        if filters:
            for key, value in filters.items():
                # Check if key has an operator suffix
                if key.endswith('_gte'):
                    column = key[:-4]  # Remove _gte
                    params[column] = f"gte.{value}"
                elif key.endswith('_gt'):
                    column = key[:-3]  # Remove _gt
                    params[column] = f"gt.{value}"
                elif key.endswith('_lte'):
                    column = key[:-4]  # Remove _lte
                    params[column] = f"lte.{value}"
                elif key.endswith('_lt'):
                    column = key[:-3]  # Remove _lt
                    params[column] = f"lt.{value}"
                elif key.endswith('_neq'):
                    column = key[:-4]  # Remove _neq
                    params[column] = f"neq.{value}"
                elif key.endswith('_like'):
                    column = key[:-5]  # Remove _like
                    params[column] = f"like.{value}"
                elif key.endswith('_ilike'):
                    column = key[:-6]  # Remove _ilike
                    params[column] = f"ilike.{value}"
                elif key.endswith('_in'):
                    column = key[:-3]  # Remove _in
                    params[column] = f"in.({value})"
                else:
                    # Default to eq operator
                    params[key] = f"eq.{value}"
        
        if order_by:
            params['order'] = order_by
            
        if limit:
            params['limit'] = limit
        
        try:
            async with httpx.AsyncClient() as client:
                print(f"🔍 Querying ZendBX: {url} with params: {params}")
                response = await client.get(
                    url,
                    params=params,
                    headers=self._get_headers(use_service_key=True),
                    timeout=30.0
                )
                
                # Log response for debugging
                if response.status_code >= 400:
                    print(f"❌ ZendBX Error {response.status_code}: {response.text}")
                    
                response.raise_for_status()
                return response.json()
        except Exception as e:
            print(f"❌ ZendBX select error for table '{table}': {str(e)}")
            raise
    
    async def insert(
        self,
        table: str,
        data: Dict[str, Any] | List[Dict[str, Any]],
        returning: str = '*'
    ) -> List[Dict[str, Any]]:
        """
        Insert data into table
        
        Args:
            table: Table name
            data: Single dict or list of dicts to insert
            returning: Columns to return
        """
        url = f"{self.base_url}/{table}"
        
        # Don't wrap single dict in a list - send as-is
        insert_data = data
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json=insert_data,
                headers={
                    **self._get_headers(use_service_key=True),
                    'Prefer': f'return=representation'
                },
                timeout=30.0
            )
            
            # Log error details if request fails
            if response.status_code >= 400:
                try:
                    error_detail = response.json()
                    print(f"❌ Insert failed with {response.status_code}: {error_detail}")
                except:
                    print(f"❌ Insert failed with {response.status_code}: {response.text}")
            
            response.raise_for_status()
            result = response.json()
            
            # Ensure result is always a list for consistency
            return result if isinstance(result, list) else [result]
    
    async def update(
        self,
        table: str,
        data: Dict[str, Any],
        filters: Dict[str, Any],
        returning: str = '*'
    ) -> List[Dict[str, Any]]:
        """
        Update data in table
        
        Args:
            table: Table name
            data: Data to update
            filters: Filter conditions (e.g., {'id': 'uuid-here'})
            returning: Columns to return
        """
        url = f"{self.base_url}/{table}"
        params = {}
        
        for key, value in filters.items():
            params[key] = f"eq.{value}"
        
        async with httpx.AsyncClient() as client:
            response = await client.patch(
                url,
                params=params,
                json=data,
                headers={
                    **self._get_headers(use_service_key=True),
                    'Prefer': f'return=representation'
                },
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
    
    async def delete(
        self,
        table: str,
        filters: Dict[str, Any]
    ) -> None:
        """
        Delete data from table
        
        Args:
            table: Table name
            filters: Filter conditions
        """
        url = f"{self.base_url}/{table}"
        params = {}
        
        for key, value in filters.items():
            params[key] = f"eq.{value}"
        
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                url,
                params=params,
                headers=self._get_headers(use_service_key=True),
                timeout=30.0
            )
            response.raise_for_status()
    
    async def rpc(
        self,
        function_name: str,
        params: Optional[Dict[str, Any]] = None
    ) -> Any:
        """
        Call a PostgreSQL function via RPC
        
        Args:
            function_name: Name of the function
            params: Function parameters
        """
        url = f"{self.base_url}/rpc/{function_name}"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json=params or {},
                headers=self._get_headers(use_service_key=True),
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()


# Global client instance
db = ZendBXClient()
