import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, UserCheck, Users, Mail, Lock, Download, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
const Login = () => {
  const {
    profileType
  } = useParams<{
    profileType: string;
  }>();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    signIn,
    user,
    profile
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [matricula, setMatricula] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user && profile) {
      if (profile.role === 'admin') {
        navigate('/admin');
      } else if (profile.role === 'coordinator') {
        navigate('/coordinator');
      }
    }
  }, [user, profile, navigate]);
  const isAdmin = profileType === 'admin';
  const isCoordinator = profileType === 'coordinator';
  const isStudent = profileType === 'student';
  const profileData = {
    admin: {
      title: "Administrador",
      description: "Acesse o painel administrativo",
      color: "primary",
      icon: UserCheck,
      dashboard: "/admin"
    },
    coordinator: {
      title: "Coordenador",
      description: "Gerencie seus projetos de extensão",
      color: "secondary",
      icon: Users,
      dashboard: "/coordinator"
    },
    student: {
      title: "Consultar Relatório",
      description: "Digite sua matrícula para baixar seu relatório",
      color: "success",
      icon: GraduationCap,
      dashboard: "/student"
    }
  };
  const currentProfile = profileData[profileType as keyof typeof profileData];
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (isStudent) {
      try {
        // Buscar dados via Edge Function (bypassa RLS para consulta pública por matrícula)
        const {
          data,
          error
        } = await supabase.functions.invoke('get-student-report', {
          body: {
            matricula
          }
        });
        if (error) {
          console.error('Edge Function error:', error);
          toast({
            title: "Erro ao consultar matrícula",
            description: error.message || "Ocorreu um erro ao buscar os dados do estudante.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
        if (!data || !data.student) {
          toast({
            title: "Aluno não encontrado!",
            description: `Nenhum aluno encontrado com a matrícula ${matricula}.`,
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
        const student = data.student;
        const participations = data.participations || [];
        const attendanceRecords = data.attendanceRecords || [];
        const totalHours = participations.reduce((sum: number, p: any) => sum + (p.total_hours || 0), 0);
        const projectsData = participations.map((p: any) => ({
          name: p.projetos?.name || 'Projeto não identificado',
          hours: p.total_hours || 0
        }));
        toast({
          title: "Relatório encontrado!",
          description: `Baixando relatório de ${student.name}`
        });
        const reportContent = `RELATÓRIO DE HORAS COMPLEMENTARES
=====================================

Nome: ${student.name}
Matrícula: ${student.matricula}
Curso: ${student.course || 'Não informado'}
Email: ${student.email || 'Não informado'}
Data de Geração: ${new Date().toLocaleDateString('pt-BR')}

PROJETOS PARTICIPADOS:
${projectsData.length > 0 ? projectsData.map(project => `- ${project.name}: ${project.hours}h`).join('\n') : 'Nenhum projeto registrado'}

TOTAL GERAL DE HORAS: ${totalHours}h

DETALHAMENTO DE ATIVIDADES:
${attendanceRecords && attendanceRecords.length > 0 ? attendanceRecords.map((record: any) => {
          // Parse date without timezone conversion
          const [year, month, day] = record.date.split('-');
          const formattedDate = `${day}/${month}/${year}`;
          return `${formattedDate} - ${record.hours}h - ${record.activity_description}`;
        }).join('\n') : 'Nenhuma atividade detalhada registrada'}

Este documento certifica a participação do aluno nos projetos de extensão universitária.

---
ExtenTrack - Sistema de Gestão de Extensão Universitária
Documento gerado automaticamente em ${new Date().toLocaleString('pt-BR')}`;
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(reportContent));
        element.setAttribute('download', `relatorio_${matricula}_${new Date().getTime()}.txt`);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        setIsLoading(false);
      } catch (error) {
        console.error('Erro geral:', error);
        toast({
          title: "Erro interno",
          description: "Ocorreu um erro inesperado. Tente novamente.",
          variant: "destructive"
        });
        setIsLoading(false);
      }
    } else {
      // Login normal para admin/coordenador usando Supabase
      const {
        error
      } = await signIn(email, password);
      setIsLoading(false);
      if (error) {
        toast({
          title: "Erro de autenticação",
          description: error.message || "Email ou senha incorretos.",
          variant: "destructive"
        });
      } else {
        // Verificar se o role do usuário logado corresponde ao tipo selecionado
        const {
          data: profileData
        } = await supabase.from('perfis').select('role').eq('user_id', (await supabase.auth.getUser()).data.user?.id).single();
        const userRole = profileData?.role;
        const expectedRole = isAdmin ? 'admin' : 'coordinator';
        if (userRole !== expectedRole) {
          // Fazer logout se o role não corresponder
          await supabase.auth.signOut();
          toast({
            title: "Acesso negado",
            description: `Esta conta não tem permissão para acessar como ${isAdmin ? 'administrador' : 'coordenador'}.`,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Login realizado com sucesso!",
            description: `Bem-vindo ao sistema!`
          });
          // Navigation será feita automaticamente pelo useEffect
        }
      }
    }
  };
  if (!currentProfile) {
    navigate('/');
    return null;
  }
  const IconComponent = currentProfile.icon;
  return <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6 hover:bg-accent">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        {/* Login Card */}
        <Card className="gradient-card shadow-xl border border-border">
          <CardHeader className="text-center space-y-4">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-lg ${isAdmin ? 'bg-primary/10' : isCoordinator ? 'bg-secondary/10' : 'bg-success/10'} mx-auto`}>
              <IconComponent className={`w-8 h-8 ${isAdmin ? 'text-primary' : isCoordinator ? 'text-secondary' : 'text-success'}`} />
            </div>
            <div>
              <CardTitle className={`text-2xl ${isAdmin ? 'text-primary' : isCoordinator ? 'text-secondary' : 'text-success'}`}>
                {currentProfile.title}
              </CardTitle>
              <CardDescription className="text-base mt-2">
                {currentProfile.description}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                {isStudent ? <div className="space-y-2">
                    <Label htmlFor="matricula" className="text-sm font-medium">
                      Número da Matrícula
                    </Label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="matricula" type="text" placeholder="Sua Matrícula" value={matricula} onChange={e => setMatricula(e.target.value)} className="pl-10 h-12" required />
                    </div>
                  </div> : <>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">
                        E-mail institucional
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input id="email" type="email" placeholder="seu.email@universidade.edu.br" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 h-12" required />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium">
                        Senha
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 h-12" required />
                      </div>
                    </div>
                  </>}
              </div>

              <Button type="submit" className={`w-full h-12 text-base font-medium ${isAdmin ? 'bg-primary hover:bg-primary-dark shadow-glow' : isCoordinator ? 'bg-secondary hover:bg-secondary-dark shadow-purple-glow' : 'bg-success hover:bg-success/90'}`} disabled={isLoading}>
                {isLoading ? isStudent ? "Buscando..." : "Entrando..." : isStudent ? <>
                      <Download className="w-4 h-4 mr-2" />
                      Baixar Relatório
                    </> : "Entrar no Sistema"}
              </Button>

            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-muted-foreground">ExtenTrack v1.0</p>
        </div>
      </div>
    </div>;
};
export default Login;