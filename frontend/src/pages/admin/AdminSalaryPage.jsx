import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import salaryApi from '../../services/salaryApi'
import { downloadPdf as savePdf } from '../../utils/pdfDownload'

const INITIAL = {
  employee_name: '', employee_id: '', job_title: '', currency: 'MMK',
  base_salary: 500000, allowances: 50000, overtime_hours: 0, overtime_rate: 0,
  bonus: 0, deductions: 0, tax_rate: 0, pension_rate: 0,
  annual_growth_rate: 5, performance_score: 3, months_to_predict: 12,
  historical_net_salaries: '',
}

const MONEY_FIELDS = ['base_salary', 'allowances', 'overtime_rate', 'bonus', 'deductions']
const CALCULATION_FIELDS = [
  ['base_salary', 'baseSalary'], ['allowances', 'allowances'], ['overtime_pay', 'overtimePay'],
  ['bonus', 'bonus'], ['gross_salary', 'grossSalary'], ['tax', 'tax'], ['pension', 'pension'],
  ['other_deductions', 'otherDeductions'], ['total_deductions', 'totalDeductions'], ['net_salary', 'netSalary'],
]

export default function AdminSalaryPage() {
  const { t } = useTranslation()
  const [form, setForm] = useState(INITIAL)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const formatter = useMemo(() => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }), [])
  const set = (name, value) => setForm(prev => ({ ...prev, [name]: value }))
  const numeric = (name, options = {}) => (
    <input className="form-control" type="number" min={options.min ?? 0} max={options.max} step={options.step ?? 0.01}
      value={form[name]} onChange={e => set(name, e.target.value)} required={options.required} />
  )

  const payload = () => ({
    ...form,
    historical_net_salaries: String(form.historical_net_salaries).trim()
      ? String(form.historical_net_salaries).split(',').map(v => Number(v.trim())).filter(Number.isFinite)
      : [],
  })

  const analyze = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      const response = await salaryApi.post('/api/salary/analyze', payload())
      setResult(response.data)
      toast.success(t('admin.salary.calculationSuccess'))
    } catch (error) {
      toast.error(error.response?.data?.error || t('admin.salary.serviceError'))
    } finally {
      setLoading(false)
    }
  }

  const downloadPdf = async () => {
    setPdfLoading(true)
    try {
      const response = await salaryApi.post('/api/salary/report', payload())
      await savePdf(response.data, `salary-report-${form.employee_id || 'employee'}.pdf`)
    } catch (error) {
      toast.error(error.response?.data?.error || t('admin.salary.pdfError'))
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="fade-in salary-page">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <div className="section-label mb-2">{t('admin.salary.eyebrow')}</div>
          <h2 className="page-title mb-1">{t('admin.salary.title')}</h2>
          <p className="text-muted mb-0">{t('admin.salary.subtitle')}</p>
        </div>
        {result && <button type="button" className="btn-primary-custom" onClick={downloadPdf} disabled={pdfLoading}>
          <i className="bi bi-file-earmark-pdf me-2"></i>{pdfLoading ? t('admin.salary.preparingPdf') : t('admin.salary.downloadPdf')}
        </button>}
      </div>

      <form onSubmit={analyze}>
        <div className="card-custom p-4 mb-4">
          <h5 className="mb-3"><i className="bi bi-person-vcard me-2"></i>{t('admin.salary.employeeSection')}</h5>
          <div className="row g-3">
            <Field label={t('admin.salary.employeeName')} col="col-md-4"><input className="form-control" maxLength={100} value={form.employee_name} onChange={e => set('employee_name', e.target.value)} required /></Field>
            <Field label={t('admin.salary.employeeId')} col="col-md-4"><input className="form-control" maxLength={50} value={form.employee_id} onChange={e => set('employee_id', e.target.value)} /></Field>
            <Field label={t('admin.salary.jobTitle')} col="col-md-4"><input className="form-control" maxLength={100} value={form.job_title} onChange={e => set('job_title', e.target.value)} /></Field>
          </div>
        </div>

        <div className="card-custom p-4 mb-4">
          <h5 className="mb-3"><i className="bi bi-calculator me-2"></i>{t('admin.salary.calculationSection')}</h5>
          <div className="row g-3">
            {MONEY_FIELDS.map(name => <Field key={name} label={t(`admin.salary.${name.replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`)} col="col-md-4">{numeric(name, { required: name === 'base_salary' })}</Field>)}
            <Field label={t('admin.salary.overtimeHours')} col="col-md-4">{numeric('overtime_hours', { max: 744 })}</Field>
            <Field label={t('admin.salary.taxRate')} col="col-md-4">{numeric('tax_rate', { max: 100 })}</Field>
            <Field label={t('admin.salary.pensionRate')} col="col-md-4">{numeric('pension_rate', { max: 100 })}</Field>
            <Field label={t('admin.salary.currency')} col="col-md-4"><input className="form-control text-uppercase" minLength={3} maxLength={3} value={form.currency} onChange={e => set('currency', e.target.value.toUpperCase())} required /></Field>
          </div>
        </div>

        <div className="card-custom p-4 mb-4">
          <h5 className="mb-3"><i className="bi bi-graph-up-arrow me-2"></i>{t('admin.salary.forecastSection')}</h5>
          <div className="row g-3">
            <Field label={t('admin.salary.annualGrowthRate')} col="col-md-4">{numeric('annual_growth_rate', { min: -50, max: 100 })}</Field>
            <Field label={t('admin.salary.performanceScore')} col="col-md-4">{numeric('performance_score', { min: 1, max: 5, step: 0.1 })}</Field>
            <Field label={t('admin.salary.monthsToPredict')} col="col-md-4">{numeric('months_to_predict', { min: 1, max: 24, step: 1 })}</Field>
            <Field label={t('admin.salary.history')} hint={t('admin.salary.historyHint')} col="col-12">
              <textarea className="form-control" rows="2" value={form.historical_net_salaries} onChange={e => set('historical_net_salaries', e.target.value)} placeholder="480000, 490000, 505000" />
            </Field>
          </div>
          <div className="d-flex justify-content-end mt-4">
            <button type="submit" className="btn-primary-custom px-4" disabled={loading}>
              <i className="bi bi-stars me-2"></i>{loading ? t('admin.salary.calculating') : t('admin.salary.calculate')}
            </button>
          </div>
        </div>
      </form>

      {result && <SalaryResult result={result} formatter={formatter} t={t} />}
    </div>
  )
}

function Field({ label, hint, col, children }) {
  return <div className={col}><label className="form-label fw-semibold">{label}</label>{children}{hint && <div className="form-text">{hint}</div>}</div>
}

function SalaryResult({ result, formatter, t }) {
  const { calculation, forecast } = result
  const money = value => `${formatter.format(value)} ${calculation.currency}`
  return <div className="row g-4">
    <div className="col-xl-5">
      <div className="card-custom p-4 h-100">
        <h5 className="mb-3">{t('admin.salary.resultTitle')}</h5>
        {CALCULATION_FIELDS.map(([key, label], index) => <div key={key} className={`d-flex justify-content-between gap-3 py-2 ${index < CALCULATION_FIELDS.length - 1 ? 'border-bottom' : ''} ${key === 'net_salary' ? 'salary-net-row' : ''}`}>
          <span>{t(`admin.salary.${label}`)}</span><strong>{money(calculation[key])}</strong>
        </div>)}
      </div>
    </div>
    <div className="col-xl-7">
      <div className="card-custom p-4 h-100">
        <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div><h5 className="mb-1">{t('admin.salary.forecastTitle')}</h5><div className="text-muted small">{t(`admin.salary.method_${forecast.method}`)}</div></div>
          {forecast.confidence_r_squared !== null && <span className="badge bg-info-subtle text-info-emphasis">R² {forecast.confidence_r_squared}</span>}
        </div>
        <div className="table-responsive salary-forecast-table"><table className="table align-middle mb-0"><thead><tr><th>{t('admin.salary.month')}</th><th className="text-end">{t('admin.salary.predictedNet')}</th></tr></thead><tbody>
          {forecast.months.map(row => <tr key={row.month}><td>{row.month}</td><td className="text-end fw-semibold">{money(row.predicted_net_salary)}</td></tr>)}
        </tbody></table></div>
        <div className="alert alert-warning small mt-3 mb-0"><i className="bi bi-info-circle me-2"></i>{t('admin.salary.disclaimer')}</div>
      </div>
    </div>
  </div>
}
