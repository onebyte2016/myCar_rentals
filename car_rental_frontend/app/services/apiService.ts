
import { error } from "console";
import { json } from "stream/consumers";
import { getAccessToken } from "../lib/actions";


type RequestOptions = {
  headers?: Record<string, string>;
  [key: string]: any;
};

const getAuthHeader = () => {
  const token = localStorage.getItem("accessToken"); // adjust if you store JWT elsewhere
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw errorData;
  }
  return response.json().catch(() => ({}));
};

// add this helper at the top of apiService.ts
const getTokenFromCookie = (): string | null => {
  if (typeof window === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith('session_access_token='))
  return match ? match.split('=')[1] : null
}

const apiService = {
  get: async function (url: string): Promise<any> {
  console.log('get', url)

  // try server action first, fall back to cookie on client
  let token: string | null = null
  try {
    token = await getAccessToken()
  } catch {
    token = getTokenFromCookie()
  }

  // if still no token, try cookie directly
  if (!token) {
    token = getTokenFromCookie()
  }

  return new Promise((resolve, reject) => {
    fetch(`${process.env.NEXT_PUBLIC_API_HOST}${url}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    })
      .then((response) => response.json())
      .then((json) => {
        console.log('Response:', json)
        resolve(json)
      })
      .catch((error) => {
        reject(error)
      })
  })
},
    // get: async function (url:string): Promise<any> {
    //     console.log('get', url);
    //     const token = await getAccessToken()

    //     return new Promise((resolve, reject) => {
    //         fetch(`${process.env.NEXT_PUBLIC_API_HOST}${url}`, {
    //             method: 'GET',
    //             headers: {
    //                 'Accept': 'application/json',
    //                 'Content-Type': 'application/json',
    //                 'Authorization': `Bearer ${token}`
    //             }
    //         })
    //         .then(response => response.json())
    //         .then((json) => {
    //             console.log('Response:', json);
    //             resolve(json);
    //         })
    //         .catch((error =>{
    //             reject(error);
    //         }))
    //     })
        
    // },

    post: async function (url: string, data: any): Promise<any> {
  const token = await getAccessToken();

  const isFormData = data instanceof FormData;

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}${url}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
    },
    body: isFormData ? data : JSON.stringify(data),
  });

  let json: any = null;
  let text: string = "";

  // Safely read response once
  try {
    text = await res.text();

    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
  } catch (err) {
    json = null;
  }

  if (!res.ok) {
    console.error("API ERROR RAW:", text);
    console.error("API ERROR JSON:", json);

    let errorMessage = "Something went wrong";

    if (json?.detail) {
      errorMessage = json.detail;
    } else if (json?.non_field_errors?.length) {
      errorMessage = json.non_field_errors[0];
    } else if (json && typeof json === "object") {
      const firstKey = Object.keys(json)[0];
      const firstVal = json[firstKey];

      if (Array.isArray(firstVal)) {
        errorMessage = firstVal[0];
      } else if (typeof firstVal === "string") {
        errorMessage = firstVal;
      }
    } else if (text) {
      errorMessage = text;
    }

    throw new Error(errorMessage);
  }

  return json;
},

  
    postWithoutToken: async function (url:string, data: any): Promise<any> {
        console.log('post', url, data);
        return new Promise((resolve, reject) =>{
            fetch(`${process.env.NEXT_PUBLIC_API_HOST}${url}`, {
                method: 'POST',
                body: data,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                   

                }
            })
            .then(response => response.json())
            .then((json) => {
                console.log('Response:', json);
                resolve(json);
            })
            .catch((error =>{
                reject(error);
            }))
        })
    },


  put: async (endpoint: string, data: any, options: RequestOptions = {}) => {
  const token = await getAccessToken();

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}${endpoint}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: JSON.stringify(data),
    ...options,
  });

  return handleResponse(res);
},

patch: async (endpoint: string, data: any, options: RequestOptions = {}) => {
  const token = await getAccessToken();

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}${endpoint}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: JSON.stringify(data),
    ...options,
  });

  return handleResponse(res);
},

delete: async (endpoint: string, options: RequestOptions = {}) => {
  const token = await getAccessToken();

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}${endpoint}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  return handleResponse(res);
},

  uploadFile: async (endpoint: string, formData: FormData, options: RequestOptions = {}) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}${endpoint}`, {
      method: "POST",
      headers: {
        ...getAuthHeader(), // include JWT for uploads if needed
      },
      body: formData,
      ...options,
    });
    return handleResponse(res);
  },
};

export default apiService;

// async function refreshAccessToken() {
//     const res = await fetch("/api/auth/refresh", {
//       method: "POST",
//     });
  
//     if (!res.ok) return null;
//     const data = await res.json();
//     return data.access;
//   }
  