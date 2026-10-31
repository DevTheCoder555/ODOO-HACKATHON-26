from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.services.forex_service import ForexService, CURRENCY_SYMBOLS

router = APIRouter(prefix="/api/forex", tags=["Dynamic Forex & Multi-Currency"])

class CurrencyConversionRequest(BaseModel):
    amount: Decimal = Field(gt=Decimal("0.00"), description="Amount to convert")
    from_currency: str = Field(default="USD", max_length=3)
    to_currency: str = Field(default="EUR", max_length=3)

@router.get("/rates")
async def get_live_rates():
    """
    Returns dynamic live currency exchange rates and symbols.
    """
    data = await ForexService.fetch_live_rates()
    data["symbols"] = CURRENCY_SYMBOLS
    return data

@router.post("/convert")
def convert_currency(req: CurrencyConversionRequest):
    """
    Dynamically converts an amount between two currencies using real-time rates.
    """
    return ForexService.convert(
        amount=req.amount,
        from_currency=req.from_currency,
        to_currency=req.to_currency
    )

