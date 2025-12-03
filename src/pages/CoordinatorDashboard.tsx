import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import extentrackLogo from "@/assets/extentrack-logo.jpg";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Plus, 
  Users, 
  Clock, 
  FileText, 
  LogOut, 
  FolderPlus,
  UserCheck,
  Download,
  Calendar as CalendarIcon,
  Edit,
  Trash2,
  Check,
  ChevronsUpDown,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const CoordinatorDashboard = () => {
  const { toast } = useToast();
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("projects");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Real data from database
  const [projects, setProjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [participations, setParticipations] = useState<any[]>([]);

  const [attendanceForm, setAttendanceForm] = useState({
    studentId: "",
    hours: "",
    date: "",
    activity: ""
  });

  const [multipleDates, setMultipleDates] = useState<Date[]>([]);
  const [isMultipleDateMode, setIsMultipleDateMode] = useState(false);

  const [newProjectForm, setNewProjectForm] = useState({
    name: "",
    description: ""
  });

  const [newStudentForm, setNewStudentForm] = useState({
    name: "",
    matricula: "",
    email: "",
    course: "",
    ano_ingresso: ""
  });

  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isNewStudentOpen, setIsNewStudentOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [attendanceStudentOpen, setAttendanceStudentOpen] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadProjects();
    loadStudents();
    loadParticipations();
  }, []);

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projetos')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao carregar projetos:', error);
      return;
    }
    setProjects(data || []);
  };

  const loadStudents = async () => {
    let allStudents: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('estudantes')
        .select('*')
        .order('name')
        .range(from, from + batchSize - 1);
      
      if (error) {
        console.error('Erro ao carregar alunos:', error);
        return;
      }

      if (data && data.length > 0) {
        allStudents = [...allStudents, ...data];
        from += batchSize;
        hasMore = data.length === batchSize;
      } else {
        hasMore = false;
      }
    }

    setStudents(allStudents);
  };

  const loadParticipations = async () => {
    const { data, error } = await supabase
      .from('participacoes_projeto')
      .select(`
        *,
        project:projetos(*),
        student:estudantes(*)
      `)
      .eq('status', 'ativo');
    
    if (error) {
      console.error('Erro ao carregar participações:', error);
      return;
    }
    setParticipations(data || []);
  };

  const handleAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProject || !attendanceForm.studentId) {
      toast({
        title: "Erro",
        description: "Selecione um projeto e um aluno.",
        variant: "destructive"
      });
      return;
    }

    const datesToRegister = isMultipleDateMode 
      ? multipleDates.map(d => format(d, 'yyyy-MM-dd'))
      : [attendanceForm.date || selectedDate];

    if (datesToRegister.length === 0 || (isMultipleDateMode && multipleDates.length === 0)) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos uma data.",
        variant: "destructive"
      });
      return;
    }

    // Verificar se existe participação do aluno no projeto
    let participation = participations.find(p => 
      p.project_id === selectedProject && p.student_id === attendanceForm.studentId
    );

    // Se não existe participação, criar uma
    if (!participation) {
      const { data: newParticipation, error: participationError } = await supabase
        .from('participacoes_projeto')
        .insert({
          project_id: selectedProject,
          student_id: attendanceForm.studentId,
          status: 'ativo'
        })
        .select()
        .single();

      if (participationError) {
        toast({
          title: "Erro",
          description: "Erro ao criar participação no projeto.",
          variant: "destructive"
        });
        return;
      }
      participation = newParticipation;
    }

    const userId = (await supabase.auth.getUser()).data.user?.id;

    // Registrar a frequência para cada data
    const attendanceRecords = datesToRegister.map(date => ({
      participation_id: participation.id,
      date: date,
      hours: parseInt(attendanceForm.hours),
      activity_description: attendanceForm.activity || 'Atividade registrada',
      created_by: userId
    }));

    const { error: attendanceError } = await supabase
      .from('registros_presenca')
      .insert(attendanceRecords);

    if (attendanceError) {
      toast({
        title: "Erro",
        description: "Erro ao registrar frequência.",
        variant: "destructive"
      });
      return;
    }

    const totalHoursRegistered = parseInt(attendanceForm.hours) * datesToRegister.length;
    toast({
      title: "Frequência registrada!",
      description: `${totalHoursRegistered}h registradas em ${datesToRegister.length} dia(s).`,
    });
    
    setAttendanceForm({
      studentId: "",
      hours: "",
      date: "",
      activity: ""
    });
    setMultipleDates([]);
    setIsMultipleDateMode(false);
    setIsAttendanceOpen(false);
    
    // Recarregar participações
    loadParticipations();
  };

  const handleNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase
      .from('projetos')
      .insert({
        name: newProjectForm.name,
        description: newProjectForm.description,
        coordinator_id: (await supabase.auth.getUser()).data.user?.id,
        status: 'ativo'
      });

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar projeto.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Projeto criado!",
      description: `Projeto "${newProjectForm.name}" criado com sucesso.`,
    });
    
    setNewProjectForm({ name: "", description: "" });
    setIsNewProjectOpen(false);
    loadProjects();
  };

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase
      .from('projetos')
      .update({
        name: editingProject.name,
        description: editingProject.description
      })
      .eq('id', editingProject.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar projeto.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Projeto atualizado!",
      description: `Projeto "${editingProject.name}" atualizado com sucesso.`,
    });
    
    setIsEditProjectOpen(false);
    setEditingProject(null);
    loadProjects();
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o projeto "${projectName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    const { error } = await supabase
      .from('projetos')
      .delete()
      .eq('id', projectId);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir projeto: " + error.message,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: `Projeto "${projectName}" excluído com sucesso.`,
    });
    loadProjects();
    loadParticipations();
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o aluno "${studentName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    const { error } = await supabase
      .from('estudantes')
      .delete()
      .eq('id', studentId);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir aluno: " + error.message,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: `Aluno "${studentName}" excluído com sucesso.`,
    });
    loadStudents();
    loadParticipations();
  };

  const openEditProject = (project: any) => {
    setEditingProject({ ...project });
    setIsEditProjectOpen(true);
  };

  const handleNewStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase
      .from('estudantes')
      .insert({
        name: newStudentForm.name,
        matricula: newStudentForm.matricula,
        email: newStudentForm.email,
        course: newStudentForm.course,
        ano_ingresso: newStudentForm.ano_ingresso || null
      });

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao cadastrar aluno.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Aluno cadastrado!",
      description: `Aluno "${newStudentForm.name}" cadastrado com sucesso.`,
    });
    
    setNewStudentForm({ name: "", matricula: "", email: "", course: "", ano_ingresso: "" });
    setIsNewStudentOpen(false);
    loadStudents();
  };

  const handleDownloadStudentReport = async (student: any) => {
    try {
      const studentParticipations = participations.filter(p => p.student_id === student.id);
      const participationIds = studentParticipations.map(p => p.id);

      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('registros_presenca')
        .select('*')
        .in('participation_id', participationIds);

      if (attendanceError) {
        console.error('Erro ao buscar frequências:', attendanceError);
      }

      const totalHours = studentParticipations.reduce((sum, p) => sum + (p.total_hours || 0), 0);
      const projectsLines = studentParticipations.length > 0
        ? studentParticipations.map((p) => `- ${p.project?.name || 'Projeto não identificado'}: ${p.total_hours || 0}h`).join('\n')
        : 'Nenhum projeto registrado';

      const attendanceLines = attendanceRecords && attendanceRecords.length > 0
        ? attendanceRecords.map((r: any) => {
            // Parse date without timezone conversion
            const [year, month, day] = r.date.split('-');
            const formattedDate = `${day}/${month}/${year}`;
            return `${formattedDate} - ${r.hours}h - ${r.activity_description}`;
          }).join('\n')
        : 'Nenhuma atividade detalhada registrada';

      const reportContent = `RELATÓRIO DE HORAS COMPLEMENTARES
=====================================

Nome: ${student.name}
Matrícula: ${student.matricula}
Curso: ${student.course || 'Não informado'}
Email: ${student.email || 'Não informado'}
Data de Geração: ${new Date().toLocaleDateString('pt-BR')}

PROJETOS PARTICIPADOS:
${projectsLines}

TOTAL GERAL DE HORAS: ${totalHours}h

DETALHAMENTO DE ATIVIDADES:
${attendanceLines}

Este documento certifica a participação do aluno nos projetos de extensão universitária.

---
ExtenTrack - Sistema de Gestão de Extensão Universitária
Documento gerado automaticamente em ${new Date().toLocaleString('pt-BR')}`;

      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(reportContent));
      element.setAttribute('download', `relatorio_${student.matricula}_${new Date().getTime()}.txt`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      toast({
        title: 'Relatório gerado!',
        description: `Baixando relatório de ${student.name}`,
      });
    } catch (e) {
      console.error(e);
      toast({
        title: 'Erro ao gerar relatório',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive'
      });
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Sessão encerrada",
      description: "Você foi deslogado com sucesso.",
    });
  };

  const getProjectStudents = (projectId: string) => {
    return participations.filter(p => p.project_id === projectId);
  };

  const getTotalHoursForAllStudents = () => {
    return participations.reduce((total, p) => total + p.total_hours, 0);
  };

  const filteredStudents = students.filter(student => {
    const query = studentSearchQuery.toLowerCase();
    return (
      student.name.toLowerCase().includes(query) ||
      student.matricula.toLowerCase().includes(query) ||
      student.email?.toLowerCase().includes(query) ||
      student.course?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-secondary text-white shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                <img src={extentrackLogo} alt="ExtenTrack Logo" className="w-full h-full object-contain p-1" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Painel do Coordenador</h1>
                <p className="text-purple-100">Gestão de projetos e alunos</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-white/20"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="gradient-card border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Projetos Ativos</p>
                  <p className="text-3xl font-bold text-secondary">{projects.length}</p>
                </div>
                <FolderPlus className="w-8 h-8 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Horas Registradas</p>
                  <p className="text-3xl font-bold text-success">
                    {getTotalHoursForAllStudents()}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Alunos Cadastrados</p>
                  <p className="text-3xl font-bold text-warning">{students.length}</p>
                </div>
                <FileText className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="projects">Projetos</TabsTrigger>
            <TabsTrigger value="students">Todos os Alunos</TabsTrigger>
          </TabsList>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-6">
            <Card className="gradient-card border border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Meus Projetos</CardTitle>
                    <CardDescription>Gerencie seus projetos de extensão</CardDescription>
                  </div>
                  <Dialog open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-secondary hover:bg-secondary-dark shadow-purple-glow">
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Projeto
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Criar Novo Projeto</DialogTitle>
                        <DialogDescription>
                          Crie um novo projeto de extensão
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleNewProject} className="space-y-4">
                        <div>
                          <Label htmlFor="projectName">Nome do Projeto</Label>
                          <Input
                            id="projectName"
                            value={newProjectForm.name}
                            onChange={(e) => setNewProjectForm({...newProjectForm, name: e.target.value})}
                            placeholder="Nome do projeto"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="projectDescription">Descrição (opcional)</Label>
                          <Textarea
                            id="projectDescription"
                            value={newProjectForm.description}
                            onChange={(e) => setNewProjectForm({...newProjectForm, description: e.target.value})}
                            placeholder="Descrição do projeto"
                            rows={3}
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button type="submit" className="bg-secondary hover:bg-secondary-dark">
                            Criar Projeto
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsNewProjectOpen(false)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {projects.map(project => (
                  <Card key={project.id} className="bg-card hover:bg-accent/50 transition-colors border border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                            <span className="text-secondary font-semibold">
                              {project.name.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold">{project.name}</h3>
                            <p className="text-sm text-muted-foreground">{project.description}</p>
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-sm text-muted-foreground">
                                <Users className="w-4 h-4 inline mr-1" />
                                {getProjectStudents(project.id).length} alunos
                              </span>
                              <span className="text-sm text-muted-foreground">
                                <Clock className="w-4 h-4 inline mr-1" />
                                {getProjectStudents(project.id).reduce((total, p) => total + p.total_hours, 0)}h registradas
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="default">
                            {project.status}
                          </Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditProject(project)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteProject(project.id, project.name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Dialog open={isAttendanceOpen && selectedProject === project.id} onOpenChange={setIsAttendanceOpen}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="default" 
                                size="sm" 
                                className="bg-primary hover:bg-primary-dark"
                                onClick={() => setSelectedProject(project.id)}
                              >
                                <CalendarIcon className="w-4 h-4 mr-2" />
                                Registrar Frequência
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Registrar Frequência - {project.name}</DialogTitle>
                                <DialogDescription>
                                  Registre as horas de atividade dos alunos neste projeto
                                </DialogDescription>
                              </DialogHeader>
                              <form onSubmit={handleAttendance} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="col-span-2">
                                    <Label htmlFor="studentId">Selecionar Aluno</Label>
                                    <Popover open={attendanceStudentOpen} onOpenChange={setAttendanceStudentOpen}>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          role="combobox"
                                          aria-expanded={attendanceStudentOpen}
                                          className="w-full justify-between"
                                        >
                                          {attendanceForm.studentId
                                            ? students.find((student) => student.id === attendanceForm.studentId)?.name + " - " + students.find((student) => student.id === attendanceForm.studentId)?.matricula
                                            : "Digite para buscar um aluno..."}
                                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-full p-0 bg-background border border-border shadow-lg z-50" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                                        <Command>
                                          <CommandInput placeholder="Digite o nome ou matrícula..." />
                                          <CommandList>
                                            <CommandEmpty>Nenhum aluno encontrado.</CommandEmpty>
                                            <CommandGroup className="max-h-60 overflow-y-auto">
                                              {students.map((student) => (
                                                <CommandItem
                                                  key={student.id}
                                                  value={`${student.name} ${student.matricula}`}
                                                  onSelect={() => {
                                                    setAttendanceForm({...attendanceForm, studentId: student.id});
                                                    setAttendanceStudentOpen(false);
                                                  }}
                                                >
                                                  <Check
                                                    className={cn(
                                                      "mr-2 h-4 w-4",
                                                      attendanceForm.studentId === student.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                  />
                                                  {student.name} - {student.matricula}
                                                </CommandItem>
                                              ))}
                                            </CommandGroup>
                                          </CommandList>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                  <div>
                                    <Label htmlFor="hours">Horas de Atividade (por dia)</Label>
                                    <Input
                                      id="hours"
                                      type="number"
                                      value={attendanceForm.hours}
                                      onChange={(e) => setAttendanceForm({...attendanceForm, hours: e.target.value})}
                                      placeholder="4"
                                      required
                                    />
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                      <Label>Modo de Seleção</Label>
                                      <Button
                                        type="button"
                                        variant={isMultipleDateMode ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => {
                                          setIsMultipleDateMode(!isMultipleDateMode);
                                          setMultipleDates([]);
                                          setAttendanceForm({...attendanceForm, date: ""});
                                        }}
                                      >
                                        {isMultipleDateMode ? "Múltiplas Datas" : "Data Única"}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Date Selection */}
                                <div>
                                  <Label>{isMultipleDateMode ? "Selecione as Datas" : "Data da Atividade"}</Label>
                                  {isMultipleDateMode ? (
                                    <div className="border rounded-md p-2">
                                      {multipleDates.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-2">
                                          {multipleDates
                                            .sort((a, b) => a.getTime() - b.getTime())
                                            .map((date, index) => (
                                              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                                {format(date, "dd/MM/yyyy")}
                                                <X 
                                                  className="h-3 w-3 cursor-pointer" 
                                                  onClick={() => setMultipleDates(multipleDates.filter((_, i) => i !== index))}
                                                />
                                              </Badge>
                                            ))}
                                        </div>
                                      )}
                                      <Calendar
                                        mode="multiple"
                                        selected={multipleDates}
                                        onSelect={(dates) => setMultipleDates(dates || [])}
                                        locale={ptBR}
                                        className="pointer-events-auto"
                                      />
                                      <p className="text-xs text-muted-foreground mt-2">
                                        {multipleDates.length} data(s) selecionada(s) = {multipleDates.length * (parseInt(attendanceForm.hours) || 0)}h total
                                      </p>
                                    </div>
                                  ) : (
                                    <Input
                                      id="date"
                                      type="date"
                                      value={attendanceForm.date}
                                      onChange={(e) => setAttendanceForm({...attendanceForm, date: e.target.value})}
                                      defaultValue={selectedDate}
                                    />
                                  )}
                                </div>
                                <div>
                                  <Label htmlFor="activity">Descrição da Atividade (opcional)</Label>
                                  <Textarea
                                    id="activity"
                                    value={attendanceForm.activity}
                                    onChange={(e) => setAttendanceForm({...attendanceForm, activity: e.target.value})}
                                    placeholder="Descreva a atividade realizada"
                                  />
                                </div>
                                <div className="flex space-x-2">
                                  <Button type="submit" className="bg-primary hover:bg-primary-dark">
                                    {isMultipleDateMode && multipleDates.length > 0 
                                      ? `Registrar ${multipleDates.length} Frequência(s)` 
                                      : "Registrar Frequência"}
                                  </Button>
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => {
                                      setIsAttendanceOpen(false);
                                      setMultipleDates([]);
                                      setIsMultipleDateMode(false);
                                    }}
                                  >
                                    Cancelar
                                  </Button>
                                </div>
                              </form>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>

                      {/* Project Participations */}
                      <div className="pt-4 border-t mt-4">
                        <h5 className="font-medium mb-2">Alunos Participantes</h5>
                        <div className="space-y-2">
                          {getProjectStudents(project.id).map((participation) => (
                            <div key={participation.id} className="flex items-center justify-between p-2 bg-muted rounded border">
                              <div>
                                <p className="text-sm font-medium">{participation.student.name}</p>
                                <p className="text-xs text-muted-foreground">Mat: {participation.student.matricula}</p>
                              </div>
                              <span className="text-sm font-medium">{participation.total_hours}h</span>
                            </div>
                          ))}
                          {getProjectStudents(project.id).length === 0 && (
                            <p className="text-sm text-muted-foreground">Nenhum aluno participando ainda.</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {projects.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Nenhum projeto criado ainda.</p>
                    <p className="text-sm text-muted-foreground">Clique em "Novo Projeto" para começar.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-6">
            <Card className="gradient-card border border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle>Todos os Alunos</CardTitle>
                    <CardDescription>Alunos cadastrados no sistema</CardDescription>
                    <div className="mt-4 max-w-md">
                      <Input
                        placeholder="Pesquisar por nome, matrícula, email ou curso..."
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Dialog open={isNewStudentOpen} onOpenChange={setIsNewStudentOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary-dark">
                          <Plus className="w-4 h-4 mr-2" />
                          Novo Aluno
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Cadastrar Novo Aluno</DialogTitle>
                          <DialogDescription>
                            Adicione um novo aluno ao sistema
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleNewStudent} className="space-y-4">
                          <div>
                            <Label htmlFor="studentName">Nome Completo</Label>
                            <Input
                              id="studentName"
                              value={newStudentForm.name}
                              onChange={(e) => setNewStudentForm({...newStudentForm, name: e.target.value})}
                              placeholder="João Silva"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="studentMatricula">Matrícula</Label>
                            <Input
                              id="studentMatricula"
                              value={newStudentForm.matricula}
                              onChange={(e) => setNewStudentForm({...newStudentForm, matricula: e.target.value})}
                              placeholder="2021001"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="studentEmail">E-mail</Label>
                            <Input
                              id="studentEmail"
                              type="email"
                              value={newStudentForm.email}
                              onChange={(e) => setNewStudentForm({...newStudentForm, email: e.target.value})}
                              placeholder="joao@email.com"
                            />
                          </div>
                          <div>
                            <Label htmlFor="studentCourse">Curso</Label>
                            <Input
                              id="studentCourse"
                              value={newStudentForm.course}
                              onChange={(e) => setNewStudentForm({...newStudentForm, course: e.target.value})}
                              placeholder="Engenharia de Software"
                            />
                          </div>
                          <div>
                            <Label htmlFor="studentAnoIngresso">Ano de Ingresso</Label>
                            <Input
                              id="studentAnoIngresso"
                              value={newStudentForm.ano_ingresso}
                              onChange={(e) => setNewStudentForm({...newStudentForm, ano_ingresso: e.target.value})}
                              placeholder="2021"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <Button type="submit" className="bg-primary hover:bg-primary-dark">
                              Cadastrar
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setIsNewStudentOpen(false)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {filteredStudents.map((student) => (
                  <Card key={student.id} className="bg-card hover:bg-accent/50 transition-colors border border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                            <span className="text-secondary font-semibold">
                              {student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold">{student.name}</h3>
                            <p className="text-sm text-muted-foreground">Matrícula: {student.matricula}</p>
                            <p className="text-sm text-muted-foreground">
                              Curso: {student.course || 'Não informado'} • Ano de Ingresso: {student.ano_ingresso || 'Não informado'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              E-mail: {student.email || 'Não informado'}
                            </p>
                          </div>
                        </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Participações</p>
                              <p className="text-xl font-bold text-primary">
                                {participations.filter(p => p.student_id === student.id).length}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Total de horas: {participations.filter(p => p.student_id === student.id).reduce((total, p) => total + p.total_hours, 0)}h
                              </p>
                            </div>
                            <Button 
                              size="sm"
                              className="bg-success hover:bg-success/90"
                              onClick={() => handleDownloadStudentReport(student)}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Baixar TXT
                            </Button>
                            <Button 
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteStudent(student.id, student.name)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {students.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Nenhum aluno cadastrado ainda.</p>
                    <p className="text-sm text-muted-foreground">Clique em "Novo Aluno" para começar.</p>
                  </div>
                )}
                
                {students.length > 0 && filteredStudents.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Nenhum aluno encontrado com os critérios de pesquisa.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Project Dialog */}
        <Dialog open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Projeto</DialogTitle>
              <DialogDescription>
                Atualize as informações do projeto
              </DialogDescription>
            </DialogHeader>
            {editingProject && (
              <form onSubmit={handleEditProject} className="space-y-4">
                <div>
                  <Label htmlFor="editProjectName">Nome do Projeto</Label>
                  <Input
                    id="editProjectName"
                    value={editingProject.name}
                    onChange={(e) => setEditingProject({...editingProject, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="editProjectDescription">Descrição (opcional)</Label>
                  <Textarea
                    id="editProjectDescription"
                    value={editingProject.description || ''}
                    onChange={(e) => setEditingProject({...editingProject, description: e.target.value})}
                    rows={3}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" className="bg-secondary hover:bg-secondary-dark">
                    Atualizar
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditProjectOpen(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CoordinatorDashboard;