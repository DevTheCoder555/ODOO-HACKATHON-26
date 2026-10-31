from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session
from app.models import TaxRule

class TaxService:
    @staticmethod
    def calculate_tax(
        db: Session,
        tax_id: Optional[int],
        amount: Decimal
    ) -> Decimal:
        if not tax_id:
            return Decimal("0.00")
        tax_rule = db.query(TaxRule).filter(TaxRule.id == tax_id, TaxRule.is_active == True).first()
        if not tax_rule:
            return Decimal("0.00")
        
        # rate is stored as decimal, e.g. 0.10 for 10%
        rate = tax_rule.rate
        if rate > Decimal("1.00"):
            rate = rate / Decimal("100")
        
        tax_amount = (amount * rate).quantize(Decimal("0.01"))
        return tax_amount

