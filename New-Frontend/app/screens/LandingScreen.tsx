import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../providers/AuthProvider';
import { Play, ChevronRight, Star, Globe, Smartphone, Tv, Monitor } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/colors';

const { width } = Dimensions.get('window');

export default function LandingScreen() {
  const navigation = useNavigation();
  const { token, loading } = useAuth();
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!loading && token) {
      navigation.navigate('Catalog');
    }
  }, [token, loading, navigation]);

  const handleGetStarted = () => {
    navigation.navigate('Login');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <View style={styles.loadingIcon}>
            <Play color="#fff" size={24} fill="#fff" />
          </View>
          <Text style={styles.loadingText}>Cargando Chapinflix...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logo}>
            <Play color="#fff" size={16} fill="#fff" />
          </View>
          <Text style={styles.logoText}>Chapinflix</Text>
        </View>
        <TouchableOpacity style={styles.loginButton} onPress={handleGetStarted}>
          <Text style={styles.loginButtonText}>Iniciar sesión</Text>
        </TouchableOpacity>
      </View>

      {/* Hero Section */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>
          El cine guatemalteco{'\n'}
          <Text style={styles.heroTitleGradient}>al alcance de todos</Text>
        </Text>
        
        <Text style={styles.heroSubtitle}>
          Descubre películas nacionales e internacionales en una plataforma diseñada 
          para promover el talento guatemalteco. Streaming de calidad, bajo costo.
        </Text>

        {/* Email Signup */}
        <View style={styles.signupContainer}>
          <TextInput
            style={styles.emailInput}
            placeholder="Ingresa tu correo electrónico"
            placeholderTextColor={Colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.startButton} onPress={handleGetStarted}>
            <Text style={styles.startButtonText}>Comenzar</Text>
            <ChevronRight color="#fff" size={16} />
          </TouchableOpacity>
        </View>

        <Text style={styles.heroFooter}>
          ¿Listo para comenzar? Crea o inicia sesión en tu cuenta.
        </Text>
      </View>

      {/* Features Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>¿Por qué elegir Chapinflix?</Text>
        <Text style={styles.sectionSubtitle}>Una plataforma pensada para Guatemala</Text>

        <View style={styles.featuresGrid}>
          <FeatureCard
            icon={<Star color="#fff" size={32} />}
            title="Contenido Nacional"
            description="Apoya el cine guatemalteco con una selección curada de producciones locales"
            gradient={['#2563eb', '#9333ea']}
          />
          <FeatureCard
            icon={<Globe color="#fff" size={32} />}
            title="Acceso Internacional"
            description="Disfruta también de películas internacionales cuidadosamente seleccionadas"
            gradient={['#9333ea', '#ec4899']}
          />
          <FeatureCard
            icon={<Play color="#fff" size={32} fill="#fff" />}
            title="Streaming de Calidad"
            description="Tecnología de vanguardia para una experiencia de visualización superior"
            gradient={['#ec4899', '#dc2626']}
          />
        </View>
      </View>

      {/* Device Compatibility */}
      <View style={[styles.section, styles.darkSection]}>
        <Text style={styles.sectionTitle}>Ve en cualquier dispositivo</Text>
        <Text style={styles.sectionSubtitle}>Chapinflix se adapta a tu estilo de vida</Text>

        <View style={styles.devicesGrid}>
          {[
            { icon: Tv, label: 'Smart TV' },
            { icon: Monitor, label: 'Computadora' },
            { icon: Smartphone, label: 'Móvil' },
            { icon: Smartphone, label: 'Tablet' },
          ].map((device, index) => (
            <View key={index} style={styles.deviceItem}>
              <View style={styles.deviceIcon}>
                <device.icon color="#60a5fa" size={32} />
              </View>
              <Text style={styles.deviceLabel}>{device.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Pricing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Precios accesibles para todos</Text>

        <View style={styles.pricingGrid}>
          {/* Free Plan */}
          <View style={styles.pricingCard}>
            <Text style={styles.planName}>Plan Gratuito</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>Q0</Text>
              <Text style={styles.priceUnit}>/mes</Text>
            </View>
            <View style={styles.featuresList}>
              <PlanFeature text="Contenido limitado" />
              <PlanFeature text="Calidad estándar" />
              <PlanFeature text="1 perfil" />
            </View>
            <TouchableOpacity style={styles.planButton} onPress={handleGetStarted}>
              <Text style={styles.planButtonText}>Comenzar gratis</Text>
            </TouchableOpacity>
          </View>

          {/* Premium Plan */}
          <View style={styles.pricingCardPremium}>
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>Recomendado</Text>
            </View>
            <Text style={[styles.planName, styles.planNamePremium]}>Plan Premium</Text>
            <View style={styles.priceContainer}>
              <Text style={[styles.price, styles.pricePremium]}>Q29</Text>
              <Text style={[styles.priceUnit, styles.priceUnitPremium]}>/mes</Text>
            </View>
            <View style={styles.featuresList}>
              <PlanFeature text="Todo el contenido" isPremium />
              <PlanFeature text="Calidad HD/4K" isPremium />
              <PlanFeature text="Hasta 5 perfiles" isPremium />
              <PlanFeature text="Descargas offline" isPremium />
            </View>
            <TouchableOpacity style={styles.planButtonPremium} onPress={handleGetStarted}>
              <Text style={styles.planButtonTextPremium}>Prueba gratis 30 días</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* CTA Final */}
      <View style={[styles.section, styles.darkSection]}>
        <Text style={styles.ctaTitle}>
          ¿Listo para descubrir el mejor entretenimiento guatemalteco?
        </Text>
        <Text style={styles.ctaSubtitle}>
          Únete a miles de guatemaltecos que ya disfrutan de Chapinflix
        </Text>
        <TouchableOpacity style={styles.ctaButton} onPress={handleGetStarted}>
          <Text style={styles.ctaButtonText}>Comenzar ahora</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerLogo}>
          <View style={styles.logo}>
            <Play color="#fff" size={16} fill="#fff" />
          </View>
          <Text style={styles.logoText}>Chapinflix</Text>
        </View>
        <Text style={styles.footerText}>
          © 2025 Chapinflix. Hecho con amor en Guatemala.
        </Text>
      </View>
    </ScrollView>
  );
}

// Feature Card Component
function FeatureCard({ icon, title, description, gradient }) {
  return (
    <View style={styles.featureCard}>
      <View style={[styles.featureIcon, { backgroundColor: gradient[0] }]}>
        {icon}
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  );
}

// Plan Feature Component
function PlanFeature({ text, isPremium = false }) {
  return (
    <View style={styles.planFeature}>
      <View style={[styles.featureDot, isPremium && styles.featureDotPremium]} />
      <Text style={[styles.featureText, isPremium && styles.featureTextPremium]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#2563eb',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  loadingText: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: 50,
    paddingBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logo: {
    width: 32,
    height: 32,
    backgroundColor: '#2563eb',
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: '#60a5fa',
  },
  loginButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  loginButtonText: {
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  hero: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 60,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  heroTitleGradient: {
    color: '#a78bfa',
  },
  heroSubtitle: {
    fontSize: Typography.sizes.lg,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 28,
  },
  signupContainer: {
    width: '100%',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  emailInput: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.text,
    fontSize: Typography.sizes.base,
  },
  startButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  startButtonText: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  heroFooter: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
  },
  section: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 60,
  },
  darkSection: {
    backgroundColor: '#1f1f1f',
  },
  sectionTitle: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  sectionSubtitle: {
    fontSize: Typography.sizes.lg,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  featuresGrid: {
    gap: Spacing.lg,
  },
  featureCard: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  featureIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  featureTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  featureDescription: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  devicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  deviceItem: {
    width: (width - Spacing.md * 2 - Spacing.lg) / 2,
    alignItems: 'center',
  },
  deviceIcon: {
    width: 64,
    height: 64,
    backgroundColor: '#1f2937',
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  deviceLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.base,
  },
  pricingGrid: {
    gap: Spacing.lg,
  },
  pricingCard: {
    backgroundColor: '#1f2937',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  pricingCardPremium: {
    backgroundColor: '#2563eb',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    position: 'relative',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  recommendedText: {
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  planName: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  planNamePremium: {
    marginTop: Spacing.md,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.lg,
  },
  price: {
    fontSize: 36,
    fontWeight: Typography.weights.bold,
    color: '#60a5fa',
  },
  pricePremium: {
    color: Colors.text,
  },
  priceUnit: {
    fontSize: Typography.sizes.lg,
    color: Colors.textSecondary,
  },
  priceUnitPremium: {
    color: '#e5e7eb',
  },
  featuresList: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  planFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#60a5fa',
  },
  featureDotPremium: {
    backgroundColor: Colors.text,
  },
  featureText: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
  },
  featureTextPremium: {
    color: Colors.text,
  },
  planButton: {
    backgroundColor: '#374151',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  planButtonText: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  planButtonPremium: {
    backgroundColor: Colors.text,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  planButtonTextPremium: {
    color: '#2563eb',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  ctaTitle: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  ctaSubtitle: {
    fontSize: Typography.sizes.lg,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  ctaButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignSelf: 'center',
  },
  ctaButtonText: {
    color: Colors.text,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.medium,
  },
  footer: {
    backgroundColor: '#1f1f1f',
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  footerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
  },
});