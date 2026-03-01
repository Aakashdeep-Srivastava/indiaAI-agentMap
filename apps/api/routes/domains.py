"""Domains route – ONDC taxonomy browser endpoint."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import OndcCategory, OndcDomain, get_db

router = APIRouter()


class CategoryItem(BaseModel):
    id: int
    code: str
    name: str


class DomainItem(BaseModel):
    id: int
    code: str
    name: str
    description: str | None
    categories: list[CategoryItem]


@router.get("/", response_model=list[DomainItem])
def list_domains(db: Session = Depends(get_db)):
    """Return all ONDC domains with their categories."""
    domains = db.query(OndcDomain).order_by(OndcDomain.code).all()
    return [
        DomainItem(
            id=d.id,
            code=d.code,
            name=d.name,
            description=d.description,
            categories=[
                CategoryItem(id=c.id, code=c.code, name=c.name)
                for c in sorted(d.categories, key=lambda c: c.code)
            ],
        )
        for d in domains
    ]
