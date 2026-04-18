import React from 'react';
import { Document, Page, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 12,
    lineHeight: 1.6,
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  body: {
    fontSize: 12,
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
  },
});

export default function ReactPdfDocument({ content, title }) {
  return (
    <Document>
      <Page style={styles.page}>
        <Text style={styles.title}>{title || 'Agent Output'}</Text>
        <Text style={styles.body}>{content}</Text>
      </Page>
    </Document>
  );
}