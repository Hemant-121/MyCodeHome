
import { AnimatePresence, motion } from 'framer-motion';

import React from 'react';

const AnimationWraper = ({ children, keyValue, initial = {opacity: 0}, animate = {opacity: 1}, transition = {duration: 2} }) => {
  return ( 
    <motion.div
        key={keyValue}
        initial={initial}
        animate={animate}
        transition={transition}
    >
        {children}

    </motion.div>
  )
}

export default AnimationWraper