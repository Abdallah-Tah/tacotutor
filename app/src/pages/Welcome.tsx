import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, Brain, Users, Sparkles, ArrowRight, Star } from 'lucide-react'

export default function Welcome() {
  return (
    <div className="min-h-screen bg-dark-bg overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl shadow-lg shadow-primary/20">
                  🌮
                </div>
                <span className="font-bold text-2xl gradient-text">TacoTutor</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6">
                AI Quran Tutor
                <span className="block gradient-text">for Kids</span>
              </h1>

              <p className="text-lg text-muted mb-8 max-w-lg leading-relaxed">
                A personalized, interactive learning platform that teaches children Quran recitation,
                Arabic letters, and Islamic values through real-time voice conversations with an AI tutor.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link to="/signup" className="btn-primary inline-flex items-center gap-2">
                  Get Started Free
                  <ArrowRight size={18} />
                </Link>
                <Link to="/login" className="btn-secondary inline-flex items-center gap-2">
                  Sign In
                </Link>
              </div>

              <div className="mt-10 flex items-center gap-6 text-sm text-muted">
                <div className="flex items-center gap-2">
                  <Star size={16} className="text-warning" />
                  <span>500+ families</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-accent" />
                  <span>Real-time voice</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-2xl" />
                <div className="relative glass-card rounded-3xl p-8">
                  <div className="arabic text-3xl leading-loose text-center mb-4 text-primary-light">
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </div>
                  <div className="text-center text-muted text-sm">
                    In the name of Allah, the Most Gracious, the Most Merciful
                  </div>
                  <div className="mt-6 flex justify-center gap-2">
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                      <motion.div
                        key={i}
                        className="w-3 h-3 rounded-full bg-primary"
                        animate={{
                          scale: [1, 1.3, 1],
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-black mb-4">How It Works</h2>
            <p className="text-muted max-w-2xl mx-auto">
              TacoTutor combines cutting-edge AI with Islamic education to create a personalized,
              engaging learning experience for every child.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Users size={24} />,
                title: 'Parent Dashboard',
                desc: 'Create profiles, assign lessons, track progress, and customize teaching instructions.',
                color: 'from-primary to-primary-dark',
              },
              {
                icon: <BookOpen size={24} />,
                title: 'Quran Lessons',
                desc: 'Choose surahs, ayahs, difficulty levels, and teaching modes for each child.',
                color: 'from-accent to-emerald-500',
              },
              {
                icon: <Brain size={24} />,
                title: 'AI Live Tutor',
                desc: 'Real-time voice conversation with barge-in support, word highlighting, and instant feedback.',
                color: 'from-secondary to-pink-500',
              },
              {
                icon: <Sparkles size={24} />,
                title: 'Progress & Rewards',
                desc: 'Track mastery scores, streaks, and celebrate achievements with stars and badges.',
                color: 'from-warning to-orange-500',
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl p-6 hover:border-primary/50 transition-colors"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10" />
            <div className="relative">
              <h2 className="text-3xl font-black mb-4">Start Your Child's Journey</h2>
              <p className="text-muted mb-8 max-w-lg mx-auto">
                Join hundreds of families using TacoTutor to make Quran learning fun, interactive,
                and effective for their children.
              </p>
              <Link to="/signup" className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4">
                Create Free Account
                <ArrowRight size={20} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌮</span>
            <span className="font-semibold">TacoTutor</span>
          </div>
          <p>Made with love for Muslim families worldwide.</p>
        </div>
      </footer>
    </div>
  )
}
