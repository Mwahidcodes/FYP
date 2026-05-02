import { Link, useNavigate } from 'react-router-dom';
import {
    HandHeart,
    Eye,
    Target,
    Globe,
    HeartHandshake,
    Sparkles
} from 'lucide-react';

const About = () => {
    const navigate = useNavigate();
    const values = [
        {
            icon: HandHeart,
            title: 'Compassion',
            description: 'Every action we take is driven by genuine care for those in need.',
        },
        {
            icon: Eye,
            title: 'Transparency',
            description: 'Complete visibility into how donations are collected and distributed.',
        },
        {
            icon: HeartHandshake,
            title: 'Trust',
            description: 'Building lasting relationships through verified processes and accountability.',
        },
        {
            icon: Sparkles,
            title: 'Impact',
            description: 'Measuring success by the real difference we make in peoples lives.',
        },
    ];

    const team = [
        {
            name: 'Muhammad Ali',
            role: 'Founder & CEO',
            image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&q=80',
            bio: 'Passionate about creating social impact through technology.',
        },
        {
            name: 'Ali Raza',
            role: 'Head of Operations',
            image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&q=80',
            bio: 'Ensures smooth donation processes and recipient verification.',
        },
        {
            name: 'Hassan Ahmed',
            role: 'Tech Lead',
            image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&q=80',
            bio: 'Building secure and scalable platforms for good.',
        },
        {
            name: 'Fatima Khan',
            role: 'Community Manager',
            image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&q=80',
            bio: 'Connecting donors and recipients with care and empathy.',
        },
    ];



    return (
        <div className="animate-fade-in">
            {/* Hero Section */}
            <section className="relative py-6 bg-gradient-to-br from-primary-50 via-white to-secondary-50 overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%2310b981%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50"></div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto">
                        <h1 className="text-4xl md:text-6xl font-normal tracking-tight text-[#124074] mb-3">
                            About <span className="font-black">Us</span>
                        </h1>

                        <p className="text-sm text-gray-600">
                            We're on a mission to create a world where generosity flows freely,
                            connecting those who want to give with those who need support —
                            all through a trusted, transparent platform.
                        </p>
                    </div>
                </div>
            </section>

            {/* Mission & Vision */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-12">
                        <div className="card bg-gradient-to-br from-primary-50 to-primary-100/30 border-primary-200">
                            <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mb-6">
                                <Target className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 font-outfit">Our Mission</h2>
                            <p className="text-gray-700 leading-relaxed text-lg">
                                To build Pakistan's most trusted donation ecosystem where every contribution
                                — whether cash or products — reaches verified recipients through a transparent,
                                secure, and caring process.
                            </p>
                        </div>

                        <div className="card bg-gradient-to-br from-secondary-50 to-secondary-100/30 border-secondary-200">
                            <div className="w-16 h-16 bg-secondary-500 rounded-2xl flex items-center justify-center mb-6">
                                <Eye className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 font-outfit">Our Vision</h2>
                            <p className="text-gray-700 leading-relaxed text-lg">
                                A Pakistan where no one suffers due to lack of resources, where technology
                                bridges the gap between generosity and need, creating lasting positive change
                                in communities across the nation.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Our Values */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="section-title">Our Core <span className="gradient-text">Values</span></h2>
                        <p className="section-subtitle mt-4">
                            The principles that guide everything we do
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {values.map((value, index) => (
                            <div key={index} className="card-hover text-center group">
                                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                                    <value.icon className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-3 font-outfit">
                                    {value.title}
                                </h3>
                                <p className="text-gray-600">{value.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>



            {/* Team Section */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="section-title">Meet Our <span className="gradient-text">Team</span></h2>
                        <p className="section-subtitle mt-4">
                            Dedicated individuals working to make a difference
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {team.map((member, index) => (
                            <div key={index} className="card-hover text-center p-8 group">
                                <div className="w-24 h-24 mx-auto rounded-full overflow-hidden mb-6 border-4 border-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                                    <img
                                        src={member.image}
                                        alt={member.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-1 font-outfit">
                                    {member.name}
                                </h3>
                                <p className="text-primary-600 font-medium mb-4">{member.role}</p>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    {member.bio}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>


            {/* CTA */}
            <section className="py-20 bg-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <Globe className="w-16 h-16 mx-auto text-primary-500 mb-6" />
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-outfit mb-6">
                        Join Our Mission
                    </h2>
                    <p className="text-xl text-gray-600 mb-8">
                        Whether you want to donate, volunteer, or spread the word —
                        there's a place for you in the Share4Good family.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/?signup=true" className="btn-primary">
                            Get Started Today
                        </Link>
                        <Link to="/contact" className="btn-secondary">
                            Contact Us
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default About;
