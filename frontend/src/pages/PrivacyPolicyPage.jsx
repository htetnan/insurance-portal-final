import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function PrivacyPolicyPage() {
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
                <i className="bi bi-shield-lock" style={{ color: '#fff', fontSize: '1.3rem' }}></i>
              </div>
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>
                  {isMy ? 'ကိုယ်ရေးကိုယ်တာ မူဝါဒ' : 'Privacy Policy'}
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                  {isMy ? 'နောက်ဆုံးပြင်ဆင်သည့်ရက်: ၂၀၂၅ ခုနှစ်၊ ဇန်နဝါရီလ ၁ ရက်' : 'Last updated: January 1, 2025'}
                </p>
              </div>
            </div>

            {isMy ? (
              <>
                <Section title="၁။ မိတ်ဆက်">
                  Digital Insurance Claim and Premiums Portal ("ကျွန်ုပ်တို့"၊ "ကျွန်ုပ်တို့၏"၊ "Portal") သည် သင့်ကိုယ်ရေးဒေတာကို ကာကွယ်ရန် ကတိကဝတ်ပြုပါသည်။ ဤ ကိုယ်ရေးကိုယ်တာ မူဝါဒသည် ကျွန်ုပ်တို့၏ ဝန်ဆောင်မှုများကို သင်အသုံးပြုသည့်အခါ သင့်အချက်အလက်များကို မည်သို့ စုဆောင်း၊ အသုံးပြု၊ သိမ်းဆည်းနှင့် ကာကွယ်သည်ကို ရှင်းလင်းဖော်ပြပါသည်။
                </Section>

                <Section title="၂။ ကျွန်ုပ်တို့ စုဆောင်းသော အချက်အလက်များ">
                  ကျွန်ုပ်တို့သည် အောက်ပါ အချက်အလက်အမျိုးအစားများကို စုဆောင်းပါသည် —
                  <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, marginTop: '0.5rem' }}>
                    <li><strong>အကောင့် အချက်အလက်:</strong> အမည်အပြည့်အစုံ၊ အီးမေးလ် လိပ်စာ၊ ဖုန်းနံပါတ်နှင့် နေအိမ် လိပ်စာ။</li>
                    <li><strong>မှတ်ပုံတင် စာရွက်စာတမ်းများ:</strong> Policy လျှောက်ထားမှုများအတွက် တင်ပြသော နိုင်ငံသား မှတ်ပုံတင် (NRC) သို့မဟုတ် အခြား မှတ်ပုံတင်စာရွက်စာတမ်းများ။</li>
                    <li><strong>ဘဏ္ဍာရေး အချက်အလက်:</strong> ပရီမီယံ ငွေပေးချေမှုများအတွက် ငွေပေးချေမှု screenshot များနှင့် ငွေလွှဲ ကိုးကားနံပါတ်များ။</li>
                    <li><strong>တောင်းဆိုမှု ဒေတာ:</strong> ဖြစ်ရပ် အသေးစိတ်များ၊ ပံ့ပိုးသည့် စာရွက်စာတမ်းများနှင့် တောင်းဆိုမှုနှင့်အတူ တင်ပြသော ဓာတ်ပုံများ။</li>
                    <li><strong>အသုံးပြုမှု ဒေတာ:</strong> Log ဒေတာ၊ ကိရိယာ အချက်အလက်နှင့် Portal အတွင်း ကြည့်ရှုမှု လှုပ်ရှားမှုများ။</li>
                  </ul>
                </Section>

                <Section title="၃။ သင့်အချက်အလက်ကို ကျွန်ုပ်တို့ မည်သို့ အသုံးပြုသနည်း">
                  သင့်အချက်အလက်ကို အောက်ပါ ရည်ရွယ်ချက်များအတွက် အသုံးပြုပါသည် —
                  <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, marginTop: '0.5rem' }}>
                    <li>သင့်အကောင့်နှင့် အာမခံ Policy များကို ဖန်တီးနှင့် စီမံခန့်ခွဲရန်။</li>
                    <li>Policy လျှောက်ထားမှုများ၊ ပရီမီယံ ငွေပေးချေမှုများနှင့် တောင်းဆိုမှုများကို ဆောင်ရွက်ရန်။</li>
                    <li>သင့်အကောင့်နှင့် Policy အခြေအနေ အကြောင်း အကြောင်းကြားချက်များ ပေးပို့ရန်။</li>
                    <li>မြန်မာနိုင်ငံ ဥပဒေနှင့်အညီ တရားဥပဒေဆိုင်ရာနှင့် စည်းကမ်းဆိုင်ရာ တာဝန်ဝတ္တရားများ ဆောင်ရွက်ရန်။</li>
                    <li>လိမ်လည်မှုနှင့် ခွင့်မပြုဘဲ ဆောင်ရွက်မှုများကို ရှာဖွေ ကာကွယ်ရန်။</li>
                    <li>Portal ၏ လုပ်ဆောင်ချက်များနှင့် အသုံးပြုသူ အတွေ့အကြုံကို တိုးတက်ကောင်းမွန်ရန်။</li>
                  </ul>
                </Section>

                <Section title="၄။ လုပ်ဆောင်ရန် ဥပဒေကြောင်းဆိုင်ရာ အခြေခံ">
                  ကျွန်ုပ်တို့သည် အောက်ပါ ဥပဒေကြောင်းဆိုင်ရာ အခြေခံများဖြင့် သင့်ကိုယ်ရေးဒေတာကို လုပ်ဆောင်ပါသည် —
                  <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, marginTop: '0.5rem' }}>
                    <li><strong>စာချုပ်ဆိုင်ရာ လိုအပ်ချက်:</strong> သင်တောင်းဆိုသော အာမခံ ဝန်ဆောင်မှုများကို ပေးအပ်ရန်။</li>
                    <li><strong>ဥပဒေဆိုင်ရာ တာဝန်:</strong> မြန်မာနိုင်ငံ အာမခံ စည်းမျဉ်းများနှင့် ဘဏ္ဍာရေး ဥပဒေများနှင့် ကိုက်ညီရန်။</li>
                    <li><strong>တရားဝင် အကျိုးစီးပွားများ:</strong> လိမ်လည်မှု ကာကွယ်ရန်နှင့် ကျွန်ုပ်တို့ Platform ၏ လုံခြုံရေးကို ထိန်းသိမ်းရန်။</li>
                    <li><strong>သဘောတူညီချက်:</strong> မားကတ်တင်း ဆက်သွယ်ရေးများကဲ့သို့ သင်သဘောတူ ခွင့်ပြုသည့် ကိစ္စများတွင်။</li>
                  </ul>
                </Section>

                <Section title="၅။ ဒေတာ မျှဝေခြင်း">
                  ကျွန်ုပ်တို့သည် သင့်ကိုယ်ရေးဒေတာကို ရောင်းချမည် မဟုတ်ပါ။ ကျွန်ုပ်တို့သည် အောက်ပါ အဖွဲ့အစည်းများနှင့် သင့်အချက်အလက်ကို မျှဝေနိုင်ပါသည် —
                  <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, marginTop: '0.5rem' }}>
                    <li>သင့်အကောင့်သို့ သတ်မှတ်ထားသော လိုင်စင်ရ အာမခံ ကိုယ်စားလှယ်များ။</li>
                    <li>သင့် Policy ကို ဆောင်ရွက်ရန် လိုအပ်သည့်အတိုင်း ပြန်လည်အာမခံ မိတ်ဖက်များနှင့် ၎င်းကို ရေးဆွဲသူများ။</li>
                    <li>ဥပဒေကြောင်း လိုအပ်သည့်အခါ အစိုးရနှင့် စည်းကမ်းထိန်းသိမ်းသည့် အာဏာပိုင်များ။</li>
                    <li>ကျင့်ဝတ် ကတိကဝတ်များ လက်အောက်မှ Portal ကို လည်ပတ်ရန် ကျွန်ုပ်တို့ ကူညီသော နည်းပညာ ဝန်ဆောင်မှု ပေးသူများ။</li>
                  </ul>
                </Section>

                <Section title="၆။ ဒေတာ သိမ်းဆည်းခြင်း">
                  သင့်အကောင့် တက်ကြွနေသမျှ ကာလပတ်လုံးနှင့် မြန်မာနိုင်ငံ အာမခံ စည်းမျဉ်းများ လိုအပ်သည့်အတိုင်း Policy သက်တမ်းကုန်ဆုံးပြီးနောက် အနည်းဆုံး ၇ နှစ်ကြာ ကျွန်ုပ်တို့သည် သင့်ကိုယ်ရေးဒေတာကို သိမ်းဆည်းပါသည်။ တရားဥပဒေ အမှုများ ဆက်လက်ဆောင်ရွက်နေမည်ဆိုပါက တောင်းဆိုမှု ဒေတာကို ပိုကြာအောင် သိမ်းဆည်းနိုင်ပါသည်။
                </Section>

                <Section title="၇။ သင့်အခွင့်အရေးများ">
                  သင်တွင် အောက်ပါ အခွင့်အရေးများ ရှိပါသည် —
                  <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, marginTop: '0.5rem' }}>
                    <li>ကျွန်ုပ်တို့ သိမ်းဆည်းထားသော သင့်ကိုယ်ရေးဒေတာကို ကြည့်ရှုရန်။</li>
                    <li>မမှန်ကန်သော ဒေတာကို ပြင်ဆင်ရန် တောင်းဆိုရန်။</li>
                    <li>သင့်ဒေတာကို ဖျက်ရန် တောင်းဆိုရန် (ဥပဒေဆိုင်ရာ သိမ်းဆည်းမှု လိုအပ်ချက်များနှင့် ပတ်သက်၍)။</li>
                    <li>မားကတ်တင်း ဆက်သွယ်ရေးများအတွက် သဘောတူညီချက်ကို မည်သည့်အချိန်မဆို ရုတ်သိမ်းရန်။</li>
                  </ul>
                  ဤ အခွင့်အရေးများ ကျင့်သုံးရန် <strong>privacy@dicp.com.mm</strong> သို့ ဆက်သွယ်ပါ။
                </Section>

                <Section title="၈။ လုံခြုံရေး">
                  ကျွန်ုပ်တို့သည် ကုဒ်ဝှက် ဒေတာ သိမ်းဆည်းမှု၊ လုံခြုံသော HTTPS ချိတ်ဆက်မှုများနှင့် အခန်းကဏ္ဍ အခြေခံ ဝင်ရောက်ထိန်းချုပ်မှုများ အပါအဝင် လုပ်ငန်းနယ်ပယ် စံနှုန်း လုံခြုံရေး နည်းလမ်းများကို အကောင်အထည်ဖော်ပါသည်။ သို့သော် မည်သည့် Online စနစ်မဆို အပြည့်အဝ လုံခြုံမှုကို အာမခံ မနိုင်ပါ။
                </Section>

                <Section title="၉။ ကွတ်ကီးများ">
                  Portal သည် အထောက်အထားစိစစ်ခြင်းအတွက် လိုအပ်သော Session ကွတ်ကီးများကို အသုံးပြုပါသည်။ ကျွန်ုပ်တို့သည် တတိယပါတီ ကြော်ငြာ ကွတ်ကီးများကို အသုံးမပြုပါ။ သင်သည် ဘရောင်ဇာ ဆက်တင်များတွင် ကွတ်ကီးများကို ပိတ်နိုင်သော်လည်း ၎င်းသည် Portal လုပ်ဆောင်ချက်ကို အကျိုးသက်ရောက်နိုင်ပါသည်။
                </Section>

                <Section title="၁၀။ ဤ မူဝါဒ ပြောင်းလဲမှုများ">
                  ကျွန်ုပ်တို့သည် ဤ ကိုယ်ရေးကိုယ်တာ မူဝါဒကို အခါအားလျော်စွာ အပ်ဒိတ်လုပ်နိုင်ပါသည်။ အရေးကြီးသော ပြောင်းလဲမှုများကို အီးမေးလ် သို့မဟုတ် app အတွင်း အကြောင်းကြားချက်မှတစ်ဆင့် သင့်အား အကြောင်းကြားမည်ဖြစ်ပါသည်။ Portal ကို ဆက်လက် အသုံးပြုခြင်းသည် အပ်ဒိတ်လုပ်ထားသော မူဝါဒကို လက်ခံသည်ဟု ဆိုလိုပါသည်။
                </Section>

                <Section title="၁၁။ ဆက်သွယ်ရန်" last>
                  ကိုယ်ရေးကိုယ်တာ နှင့် ဆက်စပ်သော မေးမြန်းမှုများအတွက် ကျွန်ုပ်တို့၏ Data Protection Officer ထံ <strong>privacy@dicp.com.mm</strong> မှတစ်ဆင့် သို့မဟုတ် ရန်ကုန်မြို့၊ မြန်မာနိုင်ငံရှိ ကျွန်ုပ်တို့၏ မှတ်ပုံတင်ထားသော ရုံးသို့စာဖြင့် ဆက်သွယ်ပါ။
                </Section>
              </>
            ) : (
              <>
                <Section title="1. Introduction">
                  Digital Insurance Claim and Premiums Portal ("we", "our", "the Portal") is committed to protecting your personal data. This Privacy Policy explains how we collect, use, store, and protect your information when you use our services.
                </Section>

                <Section title="2. Information We Collect">
                  We collect the following types of information:
                  <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, marginTop: '0.5rem' }}>
                    <li><strong>Account information:</strong> Full name, email address, phone number, and home address.</li>
                    <li><strong>Identity documents:</strong> National Registration Card (NRC) or other identity documents submitted for policy applications.</li>
                    <li><strong>Financial information:</strong> Payment screenshots and transaction references for premium payments.</li>
                    <li><strong>Claims data:</strong> Incident details, supporting documents, and photographs submitted with claims.</li>
                    <li><strong>Usage data:</strong> Log data, device information, and browsing activity within the Portal.</li>
                  </ul>
                </Section>

                <Section title="3. How We Use Your Information">
                  Your information is used to:
                  <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, marginTop: '0.5rem' }}>
                    <li>Create and manage your account and insurance policies.</li>
                    <li>Process policy applications, premium payments, and claims.</li>
                    <li>Send you notifications about your account and policy status.</li>
                    <li>Comply with legal and regulatory obligations under Myanmar law.</li>
                    <li>Detect and prevent fraud and unauthorized activity.</li>
                    <li>Improve the Portal's features and user experience.</li>
                  </ul>
                </Section>

                <Section title="4. Legal Basis for Processing">
                  We process your personal data on the following legal bases:
                  <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, marginTop: '0.5rem' }}>
                    <li><strong>Contractual necessity:</strong> To provide insurance services you have requested.</li>
                    <li><strong>Legal obligation:</strong> To comply with Myanmar insurance regulations and financial laws.</li>
                    <li><strong>Legitimate interests:</strong> To prevent fraud and maintain the security of our platform.</li>
                    <li><strong>Consent:</strong> Where you have explicitly agreed, such as for marketing communications.</li>
                  </ul>
                </Section>

                <Section title="5. Data Sharing">
                  We do not sell your personal data. We may share your information with:
                  <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, marginTop: '0.5rem' }}>
                    <li>Licensed insurance agents assigned to your account.</li>
                    <li>Reinsurance partners and underwriters as required to process your policy.</li>
                    <li>Government and regulatory authorities when legally required.</li>
                    <li>Technology service providers who help us operate the Portal, under strict confidentiality agreements.</li>
                  </ul>
                </Section>

                <Section title="6. Data Retention">
                  We retain your personal data for as long as your account is active and for a minimum of 7 years after policy expiry, as required by Myanmar insurance regulations. Claims data may be retained longer where legal proceedings are ongoing.
                </Section>

                <Section title="7. Your Rights">
                  You have the right to:
                  <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, marginTop: '0.5rem' }}>
                    <li>Access the personal data we hold about you.</li>
                    <li>Request correction of inaccurate data.</li>
                    <li>Request deletion of your data (subject to legal retention requirements).</li>
                    <li>Withdraw consent for marketing communications at any time.</li>
                  </ul>
                  To exercise these rights, contact us at <strong>privacy@dicp.com.mm</strong>.
                </Section>

                <Section title="8. Security">
                  We implement industry-standard security measures including encrypted data storage, secure HTTPS connections, and role-based access controls. However, no online system can guarantee absolute security.
                </Section>

                <Section title="9. Cookies">
                  The Portal uses session cookies required for authentication. We do not use third-party advertising cookies. You may disable cookies in your browser settings, but this may affect Portal functionality.
                </Section>

                <Section title="10. Changes to This Policy">
                  We may update this Privacy Policy periodically. We will notify you of significant changes via email or in-app notification. Continued use of the Portal constitutes acceptance of the updated policy.
                </Section>

                <Section title="11. Contact Us" last>
                  For privacy-related enquiries, contact our Data Protection Officer at <strong>privacy@dicp.com.mm</strong> or write to us at our registered office in Yangon, Myanmar.
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
