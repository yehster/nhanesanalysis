#!/usr/bin/env Rscript
args = commandArgs(trailingOnly=TRUE)
library(foreign)
df <- read.xport(args[1])
write.csv(df, file = args[2])
print("Hello World!", quote = FALSE)