import { motion } from 'framer-motion'
import HomeHero from '../features/home/components/HomeHero'
import HomeFeatures from '../features/home/components/HomeFeatures'
import HomeCollaboration from '../features/home/components/HomeCollaboration'
import { pageFade } from '../features/home/components/motionConfig'

const MotionMain = motion.main

export default function HomePage() {
  return (
    <MotionMain className="kpl-home" variants={pageFade} initial="hidden" animate="visible">
      <HomeHero />
      <HomeFeatures />
      <HomeCollaboration />
    </MotionMain>
  )
}
