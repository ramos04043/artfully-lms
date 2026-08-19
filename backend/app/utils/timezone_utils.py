"""
Timezone utilities for handling Asia/Kolkata timezone
"""
from datetime import datetime, date, time
from zoneinfo import ZoneInfo
from typing import Optional


# IST Timezone
IST = ZoneInfo("Asia/Kolkata")


def get_ist_now() -> datetime:
    """Get current datetime in IST timezone"""
    return datetime.now(IST)


def get_ist_today() -> date:
    """Get current date in IST timezone"""
    return get_ist_now().date()


def get_ist_day_of_week() -> str:
    """
    Get current day of week in IST timezone
    Returns: 'MONDAY', 'TUESDAY', etc.
    """
    return get_ist_now().strftime("%A").upper()


def ist_datetime(dt: datetime) -> datetime:
    """Convert datetime to IST timezone"""
    if dt.tzinfo is None:
        # Naive datetime, assume UTC
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt.astimezone(IST)


def format_ist_date(dt: datetime, format_str: str = "%d %b %Y") -> str:
    """Format datetime in IST timezone"""
    ist_dt = ist_datetime(dt)
    return ist_dt.strftime(format_str)


def format_ist_time(dt: datetime, format_str: str = "%I:%M %p") -> str:
    """Format time in IST timezone"""
    ist_dt = ist_datetime(dt)
    return ist_dt.strftime(format_str)


def format_time_12hr(t: time) -> str:
    """
    Format time object in 12-hour format
    Example: time(17, 0) -> "5:00 PM"
    """
    dt = datetime.combine(date.today(), t)
    return dt.strftime("%I:%M %p")


def ist_date_string(d: date) -> str:
    """
    Convert date to string format YYYY-MM-DD
    """
    return d.strftime("%Y-%m-%d")


def parse_date(date_str: str) -> date:
    """
    Parse date string YYYY-MM-DD to date object
    """
    return datetime.strptime(date_str, "%Y-%m-%d").date()


def get_utc_now() -> datetime:
    """Get current datetime in UTC"""
    return datetime.now(ZoneInfo("UTC"))


def utc_to_ist(utc_dt: datetime) -> datetime:
    """Convert UTC datetime to IST"""
    if utc_dt.tzinfo is None:
        utc_dt = utc_dt.replace(tzinfo=ZoneInfo("UTC"))
    return utc_dt.astimezone(IST)


def ist_to_utc(ist_dt: datetime) -> datetime:
    """Convert IST datetime to UTC"""
    if ist_dt.tzinfo is None:
        ist_dt = ist_dt.replace(tzinfo=IST)
    return ist_dt.astimezone(ZoneInfo("UTC"))
