export interface SiakadConfig {
  siakadUrl: string;
}

export interface LoginCredentials {
  username: string; // NIM
  password: string;
}

export interface StudentBio {
  nim: string;
  fullname: string;
  gender: string;
  phone_number: string;
  email: string;
  study_program: string;
  photo: string;
  place_of_birth: string;
  date_of_birth: string; // ISO format YYYY-MM-DD
  address: string;
}
