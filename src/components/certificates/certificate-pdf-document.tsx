import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import type { CertificateTemplate, CertificateData, CertificateFieldConfig } from '@/types';

const styles = StyleSheet.create({
  page: {
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  defaultBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#1E3A5F',
  },
  headerText: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#D4A843',
    fontSize: 14,
    letterSpacing: 4,
    textTransform: 'uppercase',
    fontWeight: 600,
    fontFamily: 'Times-Roman',
  },
  bottomStripe: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#DC2626',
  },
});

function fieldStyle(config: CertificateFieldConfig, containerWidth: number): Style {
  const base: Style = {
    position: 'absolute',
    top: config.y,
    fontSize: config.fontSize,
    fontWeight: config.fontWeight === 'bold' ? 700 : 400,
    color: config.color,
    fontFamily: 'Times-Roman',
  };

  if (config.align === 'center') {
    return { ...base, left: 0, right: 0, textAlign: 'center' };
  } else if (config.align === 'right') {
    return { ...base, right: containerWidth - config.x, textAlign: 'right' };
  }
  return { ...base, left: config.x };
}

interface CertificatePdfDocumentProps {
  template: CertificateTemplate;
  data: CertificateData;
}

export function CertificatePdfDocument({ template, data }: CertificatePdfDocumentProps) {
  const { width, height, fields } = template.layout_config;

  return (
    <Document>
      <Page size={[width, height]} style={styles.page}>
        {template.canva_design_url ? (
          <Image src={template.canva_design_url} style={styles.backgroundImage} />
        ) : (
          <View style={styles.defaultBg}>
            <Text style={styles.headerText}>Certificate of Completion</Text>
            <View style={styles.bottomStripe} />
          </View>
        )}

        {fields.student_name && (
          <Text style={fieldStyle(fields.student_name, width)}>{data.student_name}</Text>
        )}
        {fields.course_title && data.course_title && (
          <Text style={fieldStyle(fields.course_title, width)}>{data.course_title}</Text>
        )}
        {fields.completion_date && (
          <Text style={fieldStyle(fields.completion_date, width)}>{data.completion_date}</Text>
        )}
        {fields.certificate_number && (
          <Text style={fieldStyle(fields.certificate_number, width)}>{data.certificate_number}</Text>
        )}
        {fields.institution_name && (
          <Text style={fieldStyle(fields.institution_name, width)}>{data.institution_name}</Text>
        )}
      </Page>
    </Document>
  );
}
