from pydantic import BaseModel, EmailStr, Field


class SoilInput(BaseModel):
    N: float = Field(ge=0)
    P: float = Field(ge=0)
    K: float = Field(ge=0)
    temperature: float = 20.0
    humidity: float = Field(default=70.0, ge=0, le=100)
    ph: float = Field(ge=0, le=14)
    rainfall: float = Field(default=100.0, ge=0)


class SoilSubmitRequest(BaseModel):
    region: str
    area: float = Field(gt=0, le=500)
    nitrogen: float = Field(ge=0, le=200)
    phosphorus: float = Field(ge=0, le=200)
    potassium: float = Field(ge=0, le=200)
    ph: float = Field(ge=0, le=14)
    texture: str = ""
    preferences: list[str] = Field(default_factory=list)
    location: dict | None = None
    temperature: float = 20.0
    humidity: float = Field(default=70.0, ge=0, le=100)
    rainfall: float = Field(default=100.0, ge=0)


class CropScore(BaseModel):
    crop: str
    profitEstimate: float


class OversupplyInput(BaseModel):
    district_count: int = Field(ge=0)
    limit: int = Field(gt=0)


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(max_length=255)
    password: str = Field(min_length=6, max_length=128)
    region: str = Field(min_length=2, max_length=160)
    farmSize: float = Field(gt=0, le=500)
    location: dict | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    password: str = Field(min_length=6, max_length=128)
