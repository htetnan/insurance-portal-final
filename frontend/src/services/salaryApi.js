import axios from 'axios'

const salaryApi = axios.create({
  baseURL: import.meta.env.VITE_SALARY_API_URL || '/salary-api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

export default salaryApi

