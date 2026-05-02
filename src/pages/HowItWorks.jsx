import { Link, useNavigate } from 'react-router-dom';
import { Heart, UserPlus, FileCheck, Gift, Package, Gavel, ArrowRight, CheckCircle, HelpCircle, ChevronDown, ArrowLeft } from 'lucide-react';
import { useState } from 'react';

const HowItWorks = () => {
    const navigate = useNavigate();
    const [openFaq, setOpenFaq] = useState(null);

    const donorSteps = [
        { step: 1, icon: UserPlus, title: 'Create Your Account', description: 'Sign up as a donor with your basic information.' },
        { step: 2, icon: Gift, title: 'Choose Donation Type', description: 'Select between cash or product donation.' },
        { step: 3, icon: FileCheck, title: 'Submit & Upload Proof', description: 'Transfer and upload receipt or product images.' },
        { step: 4, icon: Heart, title: 'Track Your Impact', description: 'See how your donation makes a difference.' },
    ];

    const recipientSteps = [
        { step: 1, icon: UserPlus, title: 'Register as Recipient', description: 'Create an account and select recipient role.' },
        { step: 2, icon: FileCheck, title: 'Upload Verification', description: 'Submit documents for admin verification.' },
        { step: 3, icon: Package, title: 'Request Assistance', description: 'Request cash or browse available products.' },
        { step: 4, icon: Heart, title: 'Receive Help', description: 'After approval, receive the assistance.' },
    ];

    const faqs = [
        { question: 'How do I know my donation reaches the right person?', answer: 'All recipients undergo rigorous verification. Our admin team manually verifies each recipient.' },
        { question: 'What types of products can I donate?', answer: 'Clothes, books, electronics, furniture, and household items. AI verification ensures safety.' },
        { question: 'How long does recipient verification take?', answer: 'Typically 2-3 business days. You\'ll receive email updates on your status.' },
        { question: 'Is my personal information safe?', answer: 'We use industry-standard encryption and never share your information.' },
    ];

    const StepCard = ({ item, color }) => (
        <div className="card-hover h-full">
            <div className="relative inline-block mb-5">
                <div className={`w-16 h-16 bg-gradient-to-br ${color} rounded-2xl flex items-center justify-center shadow-lg`}>
                    <item.icon className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-7 h-7 bg-accent-500 rounded-full flex items-center justify-center text-white font-bold text-sm">{item.step}</div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3 font-outfit">{item.title}</h3>
            <p className="text-gray-600">{item.description}</p>
        </div>
    );

    return (
        <div className="animate-fade-in">
            {/* Hero */}
            <section className="relative py-6 bg-gradient-to-br from-primary-50 via-white to-secondary-50 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-200 rounded-full blur-3xl opacity-20 -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-200 rounded-full blur-3xl opacity-20 -ml-32 -mb-32"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center max-w-3xl mx-auto">
                        <h1 className="text-4xl md:text-6xl font-normal tracking-tight text-[#124074] mb-3">How <span className="font-black">Share4Good</span> Works</h1>
                            <p className="text-sm text-gray-600">Whether you're here to give or receive, our platform makes it easy, secure, and transparent.</p>
                        </div>
                    </div>
            </section>

            {/* For Donors */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <span className="inline-block bg-primary-100 text-primary-700 px-4 py-1 rounded-full text-sm font-medium mb-4">For Donors</span>
                        <h2 className="section-title">How to <span className="gradient-text">Donate</span></h2>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {donorSteps.map((item, i) => <StepCard key={i} item={item} color="from-primary-500 to-primary-600" />)}
                    </div>
                    <div className="text-center mt-12">
                        <Link to="/?signup=true" className="btn-primary inline-flex items-center gap-2">Start Donating <ArrowRight className="w-5 h-5" /></Link>
                    </div>
                </div>
            </section>

            {/* For Recipients */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <span className="inline-block bg-secondary-100 text-secondary-700 px-4 py-1 rounded-full text-sm font-medium mb-4">For Recipients</span>
                        <h2 className="section-title">How to <span className="gradient-text">Request Help</span></h2>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {recipientSteps.map((item, i) => <StepCard key={i} item={item} color="from-secondary-500 to-secondary-600" />)}
                    </div>
                    <div className="text-center mt-12">
                        <Link to="/?signup=true" className="btn-secondary inline-flex items-center gap-2">Request Assistance <ArrowRight className="w-5 h-5" /></Link>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-20 bg-white">
                <div className="max-w-3xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="section-title">Frequently Asked <span className="gradient-text">Questions</span></h2>
                    </div>
                    <div className="space-y-4">
                        {faqs.map((faq, i) => (
                            <div key={i} className="card">
                                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between text-left">
                                    <span className="text-lg font-semibold text-gray-800 pr-4">{faq.question}</span>
                                    <ChevronDown className={`w-5 h-5 text-primary-500 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                                </button>
                                <div className={`transition-all duration-300 ${openFaq === i ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                                    <p className="text-gray-600">{faq.answer}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 bg-gradient-to-r from-primary-600 to-secondary-600">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white font-outfit mb-6">Ready to Get Started?</h2>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/?signup=true" className="bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all shadow-lg">Create Account</Link>
                        <Link to="/contact" className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-all">Contact Support</Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HowItWorks;

