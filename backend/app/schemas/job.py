from pydantic import BaseModel, Field
from typing import List, Optional

class ExperienceRequirement(BaseModel):
    minimum_years: Optional[float] = None
    maximum_years: Optional[float] = None
    required: bool = True

class EducationRequirement(BaseModel):
    minimum_qualification: Optional[str] = ""
    preferred_qualification: Optional[str] = ""
    required: bool = False

class SkillRequirement(BaseModel):
    required: List[str] = Field(default_factory=list)
    preferred: List[str] = Field(default_factory=list)

class CommunicationRequirement(BaseModel):
    english_required: bool = False
    minimum_level: Optional[str] = None
    languages: List[str] = Field(default_factory=list)

class LocationRequirement(BaseModel):
    cities: List[str] = Field(default_factory=list)
    states: List[str] = Field(default_factory=list)
    work_mode: Optional[str] = ""  # On-site, Hybrid, Remote
    relocation_required: bool = False

class ShiftRequirement(BaseModel):
    type: Optional[str] = ""  # Day, Night, Rotational, Any shift
    timings: Optional[str] = ""
    rotational: bool = False

class SalaryRequirement(BaseModel):
    minimum: Optional[float] = None
    maximum: Optional[float] = None
    currency: str = "INR"

class CanonicalJD(BaseModel):
    job_id: str = ""
    job_title: str = ""
    job_summary: str = ""
    experience: ExperienceRequirement = Field(default_factory=ExperienceRequirement)
    education: EducationRequirement = Field(default_factory=EducationRequirement)
    skills: SkillRequirement = Field(default_factory=SkillRequirement)
    responsibilities: List[str] = Field(default_factory=list)
    role_requirements: List[str] = Field(default_factory=list)
    industry_experience: List[str] = Field(default_factory=list)
    communication: CommunicationRequirement = Field(default_factory=CommunicationRequirement)
    location: LocationRequirement = Field(default_factory=LocationRequirement)
    shift: ShiftRequirement = Field(default_factory=ShiftRequirement)
    salary: SalaryRequirement = Field(default_factory=SalaryRequirement)
    employment_type: Optional[str] = "Full Time"
    mandatory_requirements: List[str] = Field(default_factory=list)
    preferred_requirements: List[str] = Field(default_factory=list)
    other_requirements: List[str] = Field(default_factory=list)

class JobCreateResponse(BaseModel):
    job_id: str
    filename: str
    status: str
    message: str

class BatchJobUploadResponse(BaseModel):
    total_files: int
    successful_files: int
    failed_files: int
    jobs: List[JobCreateResponse]
