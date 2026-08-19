import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function TermsPage() {
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const isMy = i18n.language === 'my'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--page-bg)', color: 'var(--text-primary)' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '2.5rem 1rem' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>

          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.9rem', cursor: 'pointer', padding: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <i className="bi bi-arrow-left"></i> {isMy ? 'နောက်သို့' : 'Back'}
          </button>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '2.5rem' }}>

            <div className="d-flex align-items-center gap-3 mb-4">
              <div style={{ width: 48, height: 48, background: 'var(--primary)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="bi bi-file-earmark-text" style={{ color: '#fff', fontSize: '1.3rem' }}></i>
              </div>
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>
                  {isMy ? 'ဝန်ဆောင်မှု သတ်မှတ်ချက်များ' : 'Terms of Service'}
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                  {isMy ? 'နောက်ဆုံးပြင်ဆင်သည့်ရက်: ၂၀၂၅ ခုနှစ်၊ ဇန်နဝါရီလ ၁ ရက်' : 'Last updated: January 1, 2025'}
                </p>
              </div>
            </div>

            {isMy ? (
              <>
                <Section title="၁။ သတ်မှတ်ချက်များ လက်ခံခြင်း">
                  Digital Insurance Claim and Premiums Portal ("Portal") တွင် အကောင့် ဖန်တီးပြီး အသုံးပြုခြင်းဖြင့် ဤ ဝန်ဆောင်မှု သတ်မှတ်ချက်များကို လိုက်နာရန် သဘောတူပါသည်။ ဤ သတ်မှတ်ချက်များနှင့် သဘောမတူပါက Portal ကို ကျေးဇူးပြု၍ အသုံးမပြုပါနှင့်။
                </Section>

                <Section title="၂။ အရည်အချင်း">
                  ကျွန်ုပ်တို့၏ ဝန်ဆောင်မှုများကို မှတ်ပုံတင်ပြီး အသုံးပြုရန် သင်သည် အနည်းဆုံး အသက် ၁၈ နှစ်ရှိပြီး မြန်မာနိုင်ငံတွင် နေထိုင်သူ ဖြစ်ရမည်။ မှတ်ပုံတင်ခြင်းဖြင့် သင်ပေးသည့် အချက်အလက်အားလုံး တိကျ၊ လတ်ဆတ်၊ ပြည့်စုံသည်ဟု အတည်ပြုပါသည်။
                </Section>

                <Section title="၃။ အကောင့် မှတ်ပုံတင်ခြင်း">
                  <ul style={{ paddingLeft: '1.25rem', lineHeight: 2 }}>
                    <li>အကောင့် အထောက်အထားများ၏ လျှို့ဝှက်ရေးကို ထိန်းသိမ်းရန် သင်တာဝန်ရှိသည်။</li>
                    <li>သင့်အကောင့်သို့ ခွင့်မပြုဘဲ ဝင်ရောက်မှု တစ်ခုခု ရှိပါက ကျွန်ုပ်တို့ကို ချက်ချင်း အကြောင်းကြားရန် သဘောတူပါသည်။</li>
                    <li>တစ်ဦးသည် တက်ကြွသော Customer အကောင့် တစ်ခုထက် ပို၍ မထားနိုင်ပါ။</li>
                    <li>ဤ သတ်မှတ်ချက်များကို ချိုးဖောက်သည်ဟု တွေ့ရှိသော အကောင့်များကို ဆိုင်းငံ့ သို့မဟုတ် ဖျက်သိမ်းရန် ကျွန်ုပ်တို့တွင် အခွင့်အရေးရှိသည်။</li>
                  </ul>
                </Section>

                <Section title="၄။ အာမခံ ဝန်ဆောင်မှုများ">
                  Portal သည် အာမခံ ထုတ်ကုန်များကို ရရှိနိုင်ရန် အဆင်ပြေစေပါသည်။ Policy လျှောက်ထားမှု တင်ပြခြင်းဖြင့် သင် အောက်ပါတို့ကို သဘောတွေ့ပါသည် —
                  <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, marginTop: '0.5rem' }}>
                    <li>လျှောက်ထားမှုများတွင် ပေးသော အချက်အလက်အားလုံး မှန်ကန်တိကျ ဖြစ်ရမည်။</li>
                    <li>မမှန်ကန်သော အချက်အလက်ပေးခြင်းသည် Policy ပယ်ဖျက်ခြင်းနှင့် တရားဥပဒေ အရေးယူမှုကို ဖြစ်ပေါ်စေနိုင်သည်။</li>
                    <li>Policy အတည်ပြုခြင်းသည် Underwriting စစ်ဆေးမှုကို မူတည်ပြီး အာမခံ မပေးနိုင်ပါ။</li>
                    <li>ကိန်းဂဏန်းများတွင် ပြသသော ပရီမီယံ ပမာဏများသည် ခန့်မှန်းချက်များသာ ဖြစ်ပါသည်။</li>
                  </ul>
                </Section>

                <Section title="၅။ တောင်းဆိုမှုများ">
                  တောင်းဆိုမှု တင်ပြသည့်အခါ သင် အောက်ပါတို့ကို သဘောတူပါသည် —
                  <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, marginTop: '0.5rem' }}>
                    <li>တရားဝင် စာရွက်စာတမ်းများဖြင့် ပံ့ပိုးထားသော မှန်ကန်ရိုးသားသော တောင်းဆိုမှုများသာ တင်ပြရမည်။</li>
                    <li>ကျွန်ုပ်တို့၏ တောင်းဆိုမှု အဖွဲ့မှ ပြုလုပ်သော မည်သည့် စုံစမ်းစစ်ဆေးမှုနှင့်မဆို အပြည့်အဝ ပူးပေါင်းဆောင်ရွက်ရမည်။</li>
                    <li>လိမ်လည်သော တောင်းဆိုမှုများကို ငြင်းပယ်မည်ဖြစ်ပြီး ရာဇဝတ်မှု တရားစွဲဆိုမှုကို ဖြစ်ပေါ်စေနိုင်သည်။</li>
                  </ul>
                </Section>

                <Section title="၆။ ငွေပေးချေမှုများ">
                  ပရီမီယံ ငွေပေးချေမှုအားလုံးကို သင့် Policy အချိန်ဇယားအတိုင်း ပေးဆောင်ရမည်။ နောက်ကျ သို့မဟုတ် ငွေမပေးဘဲ ချန်လှပ်ခြင်းသည် Policy ရပ်တန့်ခြင်းကို ဖြစ်စေနိုင်သည်။ ငွေပေးချေမှု ပြေစာများကို တိကျစွာ တင်ပြရမည် — လိမ်လည်သော ငွေပေးချေမှု screenshot တင်ပြခြင်းသည် လိမ်လည်မှုကို ဖွဲ့စည်းပါသည်။
                </Section>

                <Section title="၇။ ကိုယ်ရေးကိုယ်တာ">
                  Portal ကို သင်အသုံးပြုခြင်းသည် ဤ သတ်မှတ်ချက်များတွင် ထည့်သွင်းထားသော ကျွန်ုပ်တို့၏{' '}
                  <Link to="/privacy" style={{ color: 'var(--primary)' }}>ကိုယ်ရေးကိုယ်တာ မူဝါဒ</Link>
                  {' '}ဖြင့်လည်း ထိန်းချုပ်ထားပါသည်။
                </Section>

                <Section title="၈။ တာဝန်ယူမှု ကန့်သတ်ချက်">
                  ဥပဒေ ခွင့်ပြုသည့် အပြည့်အဝ အတိုင်းအတာအထိ Portal နှင့် ၎င်း၏ လုပ်ငန်းဆောင်ရွက်သူများသည် ဝန်ဆောင်မှုကို သင်အသုံးပြုခြင်းမှ ဆင်းသက်သော မည်သည့် သွယ်ဝိုက်သော၊ ဖြစ်တောင့်ဖြစ်ခဲ သို့မဟုတ် ဆက်တိုက်ဖြစ်ပေါ်သော ပျက်စီးဆုံးရှုံးမှုများအတွက် တာဝန်မယူပါ။
                </Section>

                <Section title="၉။ သတ်မှတ်ချက်များ ပြောင်းလဲမှု">
                  ကျွန်ုပ်တို့သည် ဤ သတ်မှတ်ချက်များကို မည်သည့်အချိန်မဆို အပ်ဒိတ်လုပ်ပိုင်ခွင့်ကို ကိုင်ဆောင်ပါသည်။ ပြောင်းလဲမှုများပြီးနောက် Portal ကို ဆက်လက် အသုံးပြုခြင်းသည် အပ်ဒိတ်လုပ်ထားသော သတ်မှတ်ချက်များကို လက်ခံသည်ဟု ဆိုလိုပါသည်။
                </Section>

                <Section title="၁၀။ အုပ်ချုပ်သော ဥပဒေ">
                  ဤ သတ်မှတ်ချက်များကို ပြည်ထောင်စု သမ္မတ မြန်မာနိုင်ငံ ဥပဒေများဖြင့် အုပ်ချုပ်ပါသည်။ မည်သည့် အငြင်းပွားမှုမဆို ရန်ကုန်မြို့ တရားရုံးများတွင် ဖြေရှင်းပါမည်။
                </Section>

                <Section title="၁၁။ ဆက်သွယ်ရန်" last>
                  ဤ သတ်မှတ်ချက်များနှင့် ပတ်သက်သော မေးခွန်းများအတွက် <strong>legal@dicp.com.mm</strong> သို့ ဆက်သွယ်ပါ သို့မဟုတ် <strong>+95 1 234 5678</strong> သို့ ဖုန်းဆက်ပါ။
                </Section>
              </>
            ) : (
              <>
                <Section title="1. Acceptance of Terms">
                  By creating an account and using the Digital Insurance Claim and Premiums Portal ("the Portal"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Portal.
                </Section>

                <Section title="2. Eligibility">
                  You must be at least 18 years of age and a resident of Myanmar to register and use our services. By registering, you confirm that all information you provide is accurate, current, and complete.
                </Section>

                <Section title="3. Account Registration">
                  <ul style={{ paddingLeft: '1.25rem', lineHeight: 2 }}>
                    <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                    <li>You agree to notify us immediately of any unauthorized access to your account.</li>
                    <li>One person may not maintain more than one active customer account.</li>
                    <li>We reserve the right to suspend or terminate accounts found to violate these terms.</li>
                  </ul>
                </Section>

                <Section title="4. Insurance Services">
                  The Portal facilitates access to insurance products. By submitting a policy application you acknowledge:
                  <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, marginTop: '0.5rem' }}>
                    <li>All information provided in applications must be truthful and accurate.</li>
                    <li>Providing false information may result in policy cancellation and legal action.</li>
                    <li>Policy approval is subject to underwriting review and is not guaranteed.</li>
                    <li>Premium amounts shown in the calculator are estimates only.</li>
                  </ul>
                </Section>

                <Section title="5. Claims">
                  When filing a claim you agree to:
                  <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, marginTop: '0.5rem' }}>
                    <li>Submit only honest and truthful claims supported by valid documentation.</li>
                    <li>Cooperate fully with any investigation conducted by our claims team.</li>
                    <li>Fraudulent claims will be rejected and may result in criminal prosecution.</li>
                  </ul>
                </Section>

                <Section title="6. Payments">
                  All premium payments must be made according to your policy schedule. Late or missed payments may result in policy lapse. Payment receipts must be uploaded accurately — submitting fraudulent payment screenshots constitutes fraud.
                </Section>

                <Section title="7. Privacy">
                  Your use of the Portal is also governed by our{' '}
                  <Link to="/privacy" style={{ color: 'var(--primary)' }}>Privacy Policy</Link>,
                  which is incorporated into these Terms by reference.
                </Section>

                <Section title="8. Limitation of Liability">
                  To the fullest extent permitted by law, the Portal and its operators shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.
                </Section>

                <Section title="9. Changes to Terms">
                  We reserve the right to update these Terms at any time. Continued use of the Portal after changes constitutes acceptance of the updated Terms.
                </Section>

                <Section title="10. Governing Law">
                  These Terms are governed by the laws of the Republic of the Union of Myanmar. Any disputes shall be resolved in the courts of Yangon.
                </Section>

                <Section title="11. Contact" last>
                  For questions about these Terms, contact us at <strong>legal@dicp.com.mm</strong> or call <strong>+95 1 234 5678</strong>.
                </Section>
              </>
            )}

          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

function Section({ title, children, last }) {
  return (
    <div style={{ marginBottom: last ? 0 : '1.75rem' }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>{title}</h2>
      <div style={{ color: 'var(--text-secondary)', lineHeight: 1.85, fontSize: '0.93rem' }}>{children}</div>
    </div>
  )
}
