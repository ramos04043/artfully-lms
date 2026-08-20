"""
Keep-alive service to prevent Render free tier from sleeping.
Pings the health endpoint every 10 minutes.
"""
import asyncio
import httpx
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class KeepAliveService:
    """Service to keep the application alive on Render free tier"""
    
    def __init__(self, app_url: str, ping_interval: int = 600):
        """
        Initialize keep-alive service
        
        Args:
            app_url: Base URL of the application (e.g., https://artfully-lms.onrender.com)
            ping_interval: Interval between pings in seconds (default: 600 = 10 minutes)
        """
        self.app_url = app_url.rstrip('/')
        self.ping_interval = ping_interval
        self.health_endpoint = f"{self.app_url}/health"
        self._task = None
        self._running = False
        
    async def start(self):
        """Start the keep-alive service"""
        if self._running:
            logger.warning("Keep-alive service is already running")
            return
            
        self._running = True
        self._task = asyncio.create_task(self._ping_loop())
        logger.info(f"✅ Keep-alive service started - pinging {self.health_endpoint} every {self.ping_interval}s")
        
    async def stop(self):
        """Stop the keep-alive service"""
        if not self._running:
            return
            
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Keep-alive service stopped")
        
    async def _ping_loop(self):
        """Continuous ping loop"""
        # Wait 2 minutes before first ping (give app time to fully start)
        await asyncio.sleep(120)
        
        while self._running:
            try:
                await self._ping()
                await asyncio.sleep(self.ping_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in keep-alive ping loop: {e}")
                await asyncio.sleep(self.ping_interval)
                
    async def _ping(self):
        """Perform a single ping to the health endpoint"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(self.health_endpoint)
                
                if response.status_code == 200:
                    logger.info(f"🏓 Keep-alive ping successful at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                else:
                    logger.warning(f"Keep-alive ping returned status {response.status_code}")
                    
        except httpx.TimeoutException:
            logger.warning("Keep-alive ping timeout")
        except Exception as e:
            logger.error(f"Keep-alive ping failed: {e}")


# Global keep-alive service instance
_keepalive_service: KeepAliveService | None = None


def get_keepalive_service() -> KeepAliveService | None:
    """Get the global keep-alive service instance"""
    return _keepalive_service


def initialize_keepalive(app_url: str, ping_interval: int = 600) -> KeepAliveService:
    """
    Initialize the global keep-alive service
    
    Args:
        app_url: Base URL of the application
        ping_interval: Interval between pings in seconds (default: 600 = 10 minutes)
    
    Returns:
        KeepAliveService instance
    """
    global _keepalive_service
    _keepalive_service = KeepAliveService(app_url, ping_interval)
    return _keepalive_service
