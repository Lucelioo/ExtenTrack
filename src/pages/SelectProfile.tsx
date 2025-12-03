import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, Users, GraduationCap } from "lucide-react";
import extentrackLogo from "@/assets/extentrack-logo.jpg";
const SelectProfile = () => {
  const navigate = useNavigate();
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const handleProfileSelect = (profile: string) => {
    setSelectedProfile(profile);
    // Aguarda um pouco para mostrar a seleção e navega
    setTimeout(() => {
      navigate(`/login/${profile}`);
    }, 300);
  };
  return <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          
          <div className="inline-flex items-center justify-center w-[500px] h-40 mb-6 overflow-hidden">
            <img src={extentrackLogo} alt="ExtenTrack Logo" className="w-full h-full object-contain" />
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-3">
            Sistema de gestão de projetos de extensão universitários
          </p>
          <p className="text-base font-medium text-primary/80">
            Selecione seu perfil para continuar
          </p>
        </div>

        {/* Profile Selection Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Administrador Card */}
          <Card className={`gradient-card cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 ${selectedProfile === 'admin' ? 'border-primary shadow-glow' : 'border-border hover:border-primary/50'}`} onClick={() => handleProfileSelect('admin')}>
            <CardHeader className="text-center pb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-primary/10 mb-4 mx-auto">
                <UserCheck className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl text-primary">Administrador</CardTitle>
              <CardDescription className="text-base">
                Gerencie o sistema e coordenadores
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                  Cadastrar coordenadores
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                  Visualizar todos os projetos
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                  Gerenciar configurações do sistema
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Coordenador Card */}
          <Card className={`gradient-card cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 ${selectedProfile === 'coordinator' ? 'border-secondary shadow-purple-glow' : 'border-border hover:border-secondary/50'}`} onClick={() => handleProfileSelect('coordinator')}>
            <CardHeader className="text-center pb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-secondary/10 mb-4 mx-auto">
                <Users className="w-8 h-8 text-secondary" />
              </div>
              <CardTitle className="text-2xl text-secondary">Coordenador</CardTitle>
              <CardDescription className="text-base">
                Gerencie projetos e frequência de alunos
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-secondary rounded-full mr-3"></span>
                  Criar e gerenciar projetos
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-secondary rounded-full mr-3"></span>
                  Registrar frequência de alunos
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-secondary rounded-full mr-3"></span>
                  Exportar relatórios de horas
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Aluno Card */}
          <Card className={`gradient-card cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 ${selectedProfile === 'student' ? 'border-success shadow-lg' : 'border-border hover:border-success/50'}`} onClick={() => handleProfileSelect('student')}>
            <CardHeader className="text-center pb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-success/10 mb-4 mx-auto">
                <GraduationCap className="w-8 h-8 text-success" />
              </div>
              <CardTitle className="text-2xl text-success">Consultar Relatório</CardTitle>
              <CardDescription className="text-base">
                Baixe seu relatório de horas por matrícula
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-success rounded-full mr-3"></span>
                  Digite apenas sua matrícula
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-success rounded-full mr-3"></span>
                  Baixe seu relatório completo
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-success rounded-full mr-3"></span>
                  Todas as horas de todos os projetos
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">© 2025 ExtenTrack - Sistema Universitário de Gestão de Extensão</p>
        </div>
      </div>
    </div>;
};
export default SelectProfile;