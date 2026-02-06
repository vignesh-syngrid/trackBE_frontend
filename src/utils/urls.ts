// // const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL as string;
// // const BASE_URL = "http://localhost:4000/api"
// const BASE_URL = "https://trackbe-backend.onrender.com/api"

// const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL as string;
const BASE_URL = "http://localhost:4000/api"
// const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL as string;



console.log(BASE_URL,'--------------BASE_URL')
console.log(BASE_URL,'--------------BASE_URL')
const URLS = {
  LOGIN: `${BASE_URL}/auth/login`,
  LOGOUT: `${BASE_URL}/auth/logout`,
  GETJOBS: `${BASE_URL}/jobs`,
  GET_JOB_STATUSES: `/masters/job-statuses`,

   // Work Types (list + create)
  GETWORKTYPE: `${BASE_URL}/masters/work-types`,
  CREATE_WORK_TYPE: `${BASE_URL}/masters/work-types`,

   // Job Types (list + create)
  GET_JOB_TYPE: `${BASE_URL}/masters/job-types`,
  

  // Companies (list)
  GET_COMPANIES: `${BASE_URL}/admin/companies`,
  CREATE_COMPANY: `${BASE_URL}/admin/companies`,
  DELETE_COMPANY: `${BASE_URL}/admin/companies/{id}`,
GET_COMPANY_BY_ID: `${BASE_URL}/admin/companies/{id}`,
  UPDATE_COMPANY: `${BASE_URL}/admin/companies/{id}`,
   


   // Vendor (list)
  GET_VENDORS: `${BASE_URL}/admin/vendors`,
  CREATE_VENDOR: `${BASE_URL}/admin/vendors`,
  DELETE_VENDOR: `${BASE_URL}/admin/vendors/{id}`,
  GET_VENDOR_BY_ID: `${BASE_URL}/admin/vendors/{id}`,
  UPDATE_VENDOR: `${BASE_URL}/admin/vendors/{id}`,


  
   // User (list)
  GET_USER: `${BASE_URL}/admin/users`,
  CREATE_USER: `${BASE_URL}/admin/users`,
  DELETE_USER: `${BASE_URL}/admin/users/{id}`,
  GET_USER_BY_ID: `${BASE_URL}/admin/users/{id}`,
  UPDATE_USER: `${BASE_URL}/admin/users/{id}`,

   // Client (list)
  GET_CLIENT : `${BASE_URL}/admin/clients`,
  CREATE_CLIENT: `${BASE_URL}/admin/clients`,
  DELETE_CLIENT: `${BASE_URL}/admin/clients/{id}`,
  GET_CLIENT_BY_ID: `${BASE_URL}/admin/clients/{id}`,
  UPDATE_CLIENT: `${BASE_URL}/admin/clients/{id}`,



  // Shift (list)
  GET_SHIFT: `${BASE_URL}/masters/shifts`,
  


// Masters

   // Nature of Works (list)
  GET_NATUREOFWORK: `${BASE_URL}/masters/nature-of-work`,

   // Job Status (list)
  GET_JOBSTATUSES: `${BASE_URL}/masters/job-statuses`,

   // Subscription Types (list)
  GET_SUBSCRIPTION_TYPES: `${BASE_URL}/masters/subscription-types`,

  
   // Business Types (list)
  GET_BUSINESS_TYPES: `${BASE_URL}/masters/business-types`,

    // Regions (list)
  GET_REGION: `${BASE_URL}/masters/regions`,
  CREATE_REGION: `${BASE_URL}/masters/regions`,
  DELETE_REGION: `${BASE_URL}/masters/regions/{id}`,
  UPDATE_REGION: `${BASE_URL}/masters/regions/{id}`,
  GET_REGION_BY_ID: `${BASE_URL}/masters/regions/{id}`, 

   // Roles (list)
  // GET_ROLES: `${BASE_URL}/masters/roles`,

   // Countries (list)
  GET_COUNTRIES: `${BASE_URL}/settings/countries`,

   // States (list)
  GET_STATES: `${BASE_URL}/settings/states`,

   // Districts (list)
  GET_DISTRICTS: `${BASE_URL}/settings/districts`,

   // Pin codes (list)
  GET_PINCODES: `${BASE_URL}/settings/pincodes`,
  // Get single pincode by code (for autofill latitude/longitude)
  GET_PINCODE_BY_CODE: `${BASE_URL}/settings/pincodes/{pincode}`,
  // Create and update pincodes
  CREATE_PINCODE: `${BASE_URL}/settings/pincodes`,
  UPDATE_PINCODE: `${BASE_URL}/settings/pincodes/{id}`,

  //Attendance
   GET_ATTENDANCE: `${BASE_URL}/admin/attendance`,

  // Masters + Admin lists for job create
  GET_CLIENTS: `/admin/clients`,
  GET_USERS: `/admin/users`,
  GET_WORK_TYPES: `/masters/work-types`,
  GET_JOB_TYPES: `/masters/job-types`,
  GET_NATURE_OF_WORK: `/masters/nature-of-work`,
  GET_ROLES: `/masters/roles`,
  CREATE_JOB: `/jobs`,
 
  
  GET_JOB_DETAILS: `/jobs`,
};

export { BASE_URL, URLS };
