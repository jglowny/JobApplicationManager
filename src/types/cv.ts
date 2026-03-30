export type CvExperience = {
  role: string;
  company: string;
  period: string;
  bullets: string[];
};

export type CvProject = {
  name: string;
  period: string;
  description: string;
  bullets: string[];
};

export type CvEducation = {
  school: string;
  degree: string;
  period: string;
};

export type CvCertification = {
  name: string;
  issuer: string;
  year: string;
};

export type CvData = {
  name: string;
  title: string;
  summary: string;
  avatarUrl?: string;
  contact: {
    email: string;
    phone: string;
    location: string;
    links: string[];
  };
  skills: string[];
  languages: string;
  consentCompany: string;
  experience: CvExperience[];
  projects: CvProject[];
  education: CvEducation[];
  certifications: CvCertification[];
};
